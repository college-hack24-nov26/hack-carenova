import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score
from pathlib import Path


#1. File paths 
BASE_DIR = Path(__file__).resolve().parent 
DATA_PATH = BASE_DIR / "emergency_dataset.csv" 
MODEL_PATH = BASE_DIR / "emergency_model.pkl"



df = pd.read_csv("emergency_dataset.csv")



df = df.dropna(subset=["text", "label"])
df["text"] = df['text'].astype(str).str.strip()
df['label'] = df["label"].astype(str).str.strip()

if df.empty:
    raise ValueError("The training dataset is empty")

if df['label'].nunique() < 2:
    raise ValueError("At least two diffrent labels are  required")

X_train, X_test, y_train, y_test = train_test_split(
    df['text'],
    df['label'],
    test_size = 0.2,
    random_state=42,
    stratify=df['label']
)

model = Pipeline([
    (
        "tfidf",
        TfidfVectorizer(
            lowercase=True,
            ngram_range=(1, 2),
            sublinear_tf=True
        )
    ),
    (
        "classifier",
        LogisticRegression(
            max_iter=1000,
            class_weight="balanced",
            random_state=42
        )
    )
])

model.fit(X_train, y_train)

pred = model.predict(X_test)

print(classification_report(y_test, pred))

print(accuracy_score(y_test, pred))

joblib.dump(model, MODEL_PATH)

print("\n model saved successfully")