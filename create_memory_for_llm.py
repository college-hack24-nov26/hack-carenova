from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS


BASE_DIR = Path(__file__).resolve().parent

DATA_DIR = BASE_DIR / "data"

VECTORSTORE_DIR = BASE_DIR / "vectorstore" / "db_faiss"

EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


if not DATA_DIR.exists():
    raise FileNotFoundError(
        f"English PDF folder not found: {DATA_DIR}"
    )

pdf_files = sorted(DATA_DIR.rglob("*.pdf"))

if not pdf_files:
    raise FileNotFoundError(
        f"No PDF files found inside: {DATA_DIR}"
    )

print(f"\nFound {len(pdf_files)} PDF files.")

# 3. LOAD PDF DOCUMENTS

documents = []

for pdf_path in pdf_files:

    print(f"Loading PDF: {pdf_path.name}")

    loader = PyPDFLoader(str(pdf_path))

    pages = loader.load()

    for page in pages:

        page.metadata["source_file"] = pdf_path.name

        if "page" in page.metadata:
            page.metadata["page_number"] = (
                int(page.metadata["page"]) + 1
            )

    documents.extend(pages)

    print(
        f"Extracted {len(pages)} pages "
        f"from {pdf_path.name}"
    )

# 4. SPLIT DOCUMENTS INTO CHUNKS
splitter = RecursiveCharacterTextSplitter(
    chunk_size=700,
    chunk_overlap=100,
    separators=["\n\n", "\n", ". ", " ", ""],
)

chunks = splitter.split_documents(documents)

if not chunks:
    raise ValueError(
        "No text chunks were created. "
        "Check whether your PDFs contain extractable text."
    )

print("\nProcessing summary:")
print(f"PDF files: {len(pdf_files)}")
print(f"Pages loaded: {len(documents)}")
print(f"Text chunks: {len(chunks)}")

# 5. LOAD HUGGING FACE EMBEDDINGS
print("\nLoading Hugging Face embedding model...")

embedding_model = HuggingFaceEmbeddings(
    model_name=EMBEDDING_MODEL_NAME
)

# 6. CREATE FAISS DATABASE
print("\nCreating FAISS vector database...")

db = FAISS.from_documents(
    documents=chunks,
    embedding=embedding_model,
)

# 7. SAVE FAISS DATABASE
VECTORSTORE_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

db.save_local(str(VECTORSTORE_DIR))

print("\nFAISS database created successfully!")

print(f"Database location: {VECTORSTORE_DIR}")

print("\nSUCCESS: FAISS DATABASE READY")

print("Next step:")
print("python create_memory_with_llm.py")