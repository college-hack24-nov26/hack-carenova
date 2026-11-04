from pathlib import Path
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser


# ==========================================
# 1. PROJECT CONFIGURATION
# ==========================================

BASE_DIR = Path(__file__).resolve().parent

VECTORSTORE_DIR = BASE_DIR / "vectorstore" / "db_faiss"

EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

load_dotenv()


# ==========================================
# 2. LOAD HUGGING FACE EMBEDDINGS
# ==========================================

embedding_model = HuggingFaceEmbeddings(
    model_name=EMBEDDING_MODEL_NAME
)


# ==========================================
# 3. LOAD FAISS DATABASE
# ==========================================

if not VECTORSTORE_DIR.exists():
    raise FileNotFoundError(
        "FAISS database not found. "
        "Run create_memory_for_llm.py first."
    )

db = FAISS.load_local(
    str(VECTORSTORE_DIR),
    embedding_model,
    allow_dangerous_deserialization=True,
)

print("FAISS database loaded successfully!")


# ==========================================
# 4. CREATE RETRIEVER
# ==========================================

retriever = db.as_retriever(
    search_kwargs={"k": 3}
)


# ==========================================
# 5. LOAD GROQ LLM
# ==========================================


llm = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0
)



# ==========================================
# 6. CREATE PROMPT
# ==========================================

prompt = ChatPromptTemplate.from_template("""
You are a First Aid Guide AI assistant.

Answer the user's question using the provided first-aid context.

Rules:
- Give clear, simple, step-by-step guidance.
- Do not invent medical information.
- If the context does not contain the answer, say so.
- For life-threatening emergencies, advise contacting
  India's emergency number 112 immediately.
- Do not claim to diagnose a medical condition.

Context:
{context}

User Question:
{question}

Answer:
""")


# ==========================================
# 7. CREATE QUESTION-ANSWER FUNCTION
# ==========================================

def ask_question(question):

    documents = retriever.invoke(question)

    if not documents:
        return "No relevant information found in the knowledge base."

    context = "\n\n".join(
        document.page_content
        for document in documents
    )

    chain = prompt | llm | StrOutputParser()

    answer = chain.invoke({
        "context": context,
        "question": question
    })

    return answer


# ==========================================
# 8. TEST THE CHATBOT
# ==========================================

if __name__ == "__main__":

    question = input("Ask a first-aid question: ")

    answer = ask_question(question)

    print("\nFirst Aid Guide AI:")
    print(answer)
