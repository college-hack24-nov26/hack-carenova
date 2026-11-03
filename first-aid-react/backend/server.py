"""
FastAPI wrapper that exposes your EXISTING Python modules to the React frontend.

Put this file in your ORIGINAL project root (next to create_memory_with_llm.py,
emergency_detection.py, predict_image.py, .env, vectorstore/, models/) — or keep it in
backend/ and run it from the project root so those imports resolve.

Run (from the project root):
    pip install fastapi "uvicorn[standard]" python-multipart
    uvicorn server:app --reload --port 8000
"""

import os
import tempfile
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

def require_user(authorization: Optional[str] = Header(default=None)):
    """
    Optional protection: when REQUIRE_AUTH=true in .env, every API call must carry the
    Supabase access token that the React app sends. The token is verified with Supabase Auth.
    Needs SUPABASE_URL and SUPABASE_ANON_KEY in the Python .env too.
    """
    if os.getenv("REQUIRE_AUTH", "false").lower() != "true":
        return None
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Log in to use this feature.")
    import requests

    resp = requests.get(
        f"{os.environ['SUPABASE_URL'].rstrip('/')}/auth/v1/user",
        headers={"Authorization": authorization, "apikey": os.environ["SUPABASE_ANON_KEY"]},
        timeout=10,
    )
    if resp.status_code != 200:
        raise HTTPException(401, "Invalid or expired session. Please log in again.")
    return resp.json()


app = FastAPI(title="First Aid Guide AI API", dependencies=[Depends(require_user)])
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------------------- RAG helpers (same logic as the Streamlit app) -----
def get_rag():
    import create_memory_with_llm as memory

    if not hasattr(memory, "ask_question"):
        raise RuntimeError("create_memory_with_llm.py must expose ask_question(question).")
    if getattr(memory, "db", None) is None:
        raise RuntimeError("FAISS database is unavailable. Run create_memory_for_llm.py first.")
    if getattr(memory, "llm", None) is None:
        raise RuntimeError("Groq LLM is unavailable. Check GROQ_API_KEY in your .env file.")
    return memory


def answer_question(memory, question: str):
    docs = memory.db.similarity_search(question, k=3)
    answer = str(memory.ask_question(question))
    return answer, docs


def serialise_sources(docs):
    out = []
    for d in docs:
        meta = getattr(d, "metadata", None) or {}
        page = meta.get("page_number")
        if page is None and meta.get("page") is not None:
            try:
                page = int(meta["page"]) + 1
            except (TypeError, ValueError):
                page = meta["page"]
        out.append(
            {
                "source_file": meta.get("source_file")
                or meta.get("source")
                or meta.get("file_path")
                or "Knowledge base",
                "page_number": page,
            }
        )
    return out


def safe_screen(text: str):
    try:
        from emergency_detection import screen_emergency

        return screen_emergency(text)
    except Exception:
        return None


# ----------------------------- Schemas -------------------------------------------
class ScreenIn(BaseModel):
    text: str


class Turn(BaseModel):
    role: str
    content: str


class ChatIn(BaseModel):
    question: str
    history: List[Turn] = []
    profile: Optional[str] = ""


class MultiIn(BaseModel):
    question: str
    language: str = "English"
    profile: Optional[str] = ""


class EvalIn(BaseModel):
    question: str


def with_profile(question: str, profile: Optional[str]) -> str:
    """Optionally give the model the user's health profile as background context."""
    if not profile:
        return question
    return (
        f"{question}\n\n"
        f"Background about the person (use only to make safety notes more relevant, e.g. "
        f"allergies, blood thinners, pregnancy; do not diagnose): {profile}"
    )


# ----------------------------- Endpoints -----------------------------------------
@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/screen")
def screen(body: ScreenIn):
    result = safe_screen(body.text)
    if result is None:
        raise HTTPException(500, "emergency_detection.screen_emergency is unavailable.")
    return result


@app.post("/api/chat")
def chat(body: ChatIn):
    try:
        memory = get_rag()
        question = body.question
        recent = [t for t in body.history if t.role in {"user", "assistant"}][-6:]
        if recent:
            history_text = "\n".join(f"{t.role}: {t.content}" for t in recent)
            prompt = (
                "Rewrite the latest first-aid question as a standalone question using "
                "the recent conversation. Do not answer it or invent facts.\n\n"
                f"Conversation:\n{history_text}\n\nLatest question:\n{question}"
            )
            question = str(memory.llm.invoke(prompt).content).strip()
        answer, docs = answer_question(memory, with_profile(question, body.profile))
        return {"answer": answer, "sources": serialise_sources(docs)}
    except Exception as exc:
        raise HTTPException(500, str(exc))


@app.post("/api/predict-image")
async def predict(image: UploadFile = File(...)):
    suffix = Path(image.filename or "").suffix or ".jpg"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(await image.read())
            tmp_path = tmp.name
        from predict_image import predict_injury

        return predict_injury(tmp_path)
    except Exception as exc:
        raise HTTPException(500, str(exc))
    finally:
        if tmp_path:
            Path(tmp_path).unlink(missing_ok=True)


@app.post("/api/multilingual")
def multilingual(body: MultiIn):
    try:
        memory = get_rag()
        lang = body.language
        if lang != "English":
            query = str(
                memory.llm.invoke(
                    "Translate this first-aid question into English faithfully. Do not answer it "
                    f"or add facts. Return only the translation:\n{body.question}"
                ).content
            ).strip()
        else:
            query = body.question
        emergency = safe_screen(body.question)
        answer, docs = answer_question(memory, with_profile(query, body.profile))
        if lang != "English":
            answer = str(
                memory.llm.invoke(
                    f"Translate this first-aid information into {lang}. "
                    "Preserve all warnings, uncertainty, and emergency instructions. Do not add "
                    "procedures, diagnoses, medicines or doses. "
                    f"Return only the translation:\n\n{answer}"
                ).content
            ).strip()
        return {"answer": answer, "sources": serialise_sources(docs), "emergency": emergency}
    except Exception as exc:
        raise HTTPException(500, str(exc))


@app.post("/api/evaluate")
def evaluate(body: EvalIn):
    try:
        memory = get_rag()
        docs = memory.db.similarity_search(body.question, k=4)
        answer, sources = answer_question(memory, body.question)
        context = "\n\n".join(d.page_content for d in docs)
        prompt = f"""
Evaluate the following first-aid chatbot answer for educational testing only.
Score 0 to 5 for (1) relevance to the question and (2) faithfulness to retrieved context.
Briefly justify each score. Do not call this a medical safety certification.

Question: {body.question}
Retrieved context:
{context}
Answer:
{answer}
"""
        evaluation = memory.llm.invoke(prompt)
        return {
            "answer": answer,
            "evaluation": str(getattr(evaluation, "content", evaluation)),
            "sources": serialise_sources(sources),
        }
    except Exception as exc:
        raise HTTPException(500, str(exc))
