import re
import joblib
from pathlib import Path

# Load trained model
MODEL_PATH = Path(__file__).resolve().parent / "emergency_model.pkl"

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        "emergency_model.pkl not found. Train the model first."
    )

model = joblib.load(MODEL_PATH)


# Emergency warning signs
EMERGENCY_PATTERNS = {
    "Breathing emergency": [
        r"\bcannot breathe\b",
        r"\bcan't breathe\b",
        r"\bnot breathing\b",
        r"\bchoking\b",
    ],
    "Unconsciousness": [
        r"\bunconscious\b",
        r"\bunresponsive\b",
        r"\bnot responding\b",
        r"\bcollapsed\b",
    ],
    "Possible stroke": [
        r"\bface drooping\b",
        r"\bslurred speech\b",
        r"\bsudden arm weakness\b",
    ],
    "Possible heart attack": [
        r"\bchest pain\b",
        r"\bchest pressure\b",
        r"\bheart attack\b",
    ],
    "Severe injury": [
        r"\bsevere bleeding\b",
        r"\bbleeding heavily\b",
        r"\bmajor accident\b",
    ],
}


def screen_emergency(user_text):
    """Screen text for possible emergency warning signs."""

    text = re.sub(
        r"\s+",
        " ",
        str(user_text or "").lower()
    ).strip()

    if not text:
        return {
            "emergency": False,
            "level": "unknown",
            "categories": [],
            "message": "Please describe the situation."
        }

    # Step 1: Check explicit emergency warning signs
    detected = []

    for category, patterns in EMERGENCY_PATTERNS.items():
        if any(
            re.search(pattern, text)
            for pattern in patterns
        ):
            detected.append(category)

    # Explicit warning signs take priority
    if detected:
        return {
            "emergency": True,
            "level": "urgent",
            "categories": detected,
            "message": (
                "Potential emergency detected. "
                "Call 112 in India if emergency assistance is needed. "
                "Do not delay medical care."
            )
        }

    # Step 2: Use the ML model as a secondary signal
    prediction = str(model.predict([text])[0]).strip().lower()

    emergency_labels = {
        "emergency",
        "breathing_emergency",
        "unresponsive_collapse",
        "possible_stroke",
        "possible_heart_attack",
        "severe_bleeding_injury",
        "urgent_exposure_injury",
    }

    # Step 3: Check the model's prediction confidence
    probabilities = model.predict_proba([text])[0]
    classes = model.classes_

    predicted_index = list(classes).index(
        model.predict([text])[0]
    )

    confidence = float(probabilities[predicted_index])

    # Conservative confidence threshold for ML-only detection.
    # This is a starting point, not a clinically validated threshold.
    if (
        prediction in emergency_labels
        and confidence >= 0.80
    ):
        return {
            "emergency": True,
            "level": "urgent",
            "categories": [prediction],
            "confidence": confidence,
            "message": (
                "Potential emergency detected by the screening model. "
                "Seek appropriate medical assistance."
            )
        }

    # Step 4: No emergency warning identified
    return {
        "emergency": False,
        "level": "unknown",
        "categories": [],
        "confidence": confidence,
        "message": (
            "No emergency warning was identified by this screening. "
            "This does not rule out an emergency."
        )
    }