"""
Conversational First Aid Assistant
First Aid Guide AI

Features:
1. Emergency detection using ML and rules.
2. Conversation-aware question rewriting.
3. RAG-based answer generation using FAISS.
4. Groq LLM integration.
"""

import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq

from emergency_detection import screen_emergency

from create_memory_with_llm import ask_question


# ==========================================
# 1. CONFIGURATION
# ==========================================

load_dotenv()

GROQ_MODEL_NAME = "openai/gpt-oss-120b"


EMERGENCY_RESPONSE = (
    "🚨 A potential medical emergency has been detected.\n\n"
    "If someone is experiencing a life-threatening emergency, "
    "call 112 in India immediately.\n\n"
    "Follow the emergency dispatcher's instructions. "
    "Do not delay medical care while waiting for AI guidance."
)


# ==========================================
# 2. EMERGENCY DETECTION
# ==========================================

def detect_emergency(question: str) -> bool:
    """Check a question for potential emergency warning signs."""

    if not isinstance(question, str) or not question.strip():
        return False

    result = screen_emergency(question)

    return result.get("emergency", False)


# ==========================================
# 3. REWRITE FOLLOW-UP QUESTIONS
# ==========================================

def rewrite_as_standalone_question(
    llm,
    question: str,
    chat_history: list
) -> str:
    """Rewrite a follow-up question using recent conversation history."""

    history = []

    for message in (chat_history or [])[-6:]:
        if not isinstance(message, dict):
            continue

        role = message.get("role", "user")
        content = message.get("content", "")

        if isinstance(content, str) and content.strip():
            history.append(f"{role}: {content}")

    history_text = "\n".join(history)

    prompt = f"""
Rewrite the latest question as a standalone question using
the conversation history.

Rules:
- Do not answer the question.
- Do not invent medical details.
- Preserve the user's original meaning.
- Return only the rewritten question.

Conversation history:
{history_text}

Latest question:
{question}
"""

    response = llm.invoke(prompt)
    rewritten = response.content

    if not isinstance(rewritten, str):
        rewritten = str(rewritten)

    return rewritten.strip() or question


# ==========================================
# 4. GENERATE FIRST-AID ANSWER
# ==========================================

def generate_first_aid_answer(
    question: str,
    chat_history: list
):
    """
    Return:
        answer, sources, is_emergency

    Uses emergency screening before RAG answer generation.
    """

    if not isinstance(question, str) or not question.strip():
        return "Please enter your question.", [], False

    question = question.strip()

    # Step 1: Screen the current question
    if detect_emergency(question):
        return EMERGENCY_RESPONSE, [], True

    # Step 2: Initialize the Groq model for question rewriting
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise ValueError(
            "GROQ_API_KEY is missing from your .env file."
        )

    llm = ChatGroq(
        model=GROQ_MODEL_NAME,
        temperature=0,
        api_key=api_key,
    )

    # Step 3: Rewrite the question using conversation history
    rewritten_question = rewrite_as_standalone_question(
        llm=llm,
        question=question,
        chat_history=chat_history or [],
    )

    # Step 4: Generate an answer using your existing FAISS + Groq RAG
    answer = ask_question(rewritten_question)

    if not isinstance(answer, str):
        answer = str(answer)

    # Your current ask_question() returns only the answer,
    # not source documents.
    return answer, [], False


# ==========================================
# 5. TEST THE ASSISTANT
# ==========================================

if __name__ == "__main__":

    history = []

    print("First Aid Guide AI")
    print("Type 'exit' to stop.")

    while True:

        question = input("\nYou: ").strip()

        if question.lower() == "exit":
            break

        try:
            answer, sources, is_emergency = (
                generate_first_aid_answer(
                    question,
                    history
                )
            )

            print("\nFirst Aid Guide AI:")
            print(answer)

            if is_emergency:
                print("\nEmergency screening triggered.")

            history.append({
                "role": "user",
                "content": question
            })

            history.append({
                "role": "assistant",
                "content": answer
            })

        except Exception as error:
            print("\nUnable to generate an answer:", error)
