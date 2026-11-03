# ============================================================
# FIRST AID GUIDE AI
# Injury Image Prediction
# ============================================================

import os
import sys
import json

import numpy as np
import tensorflow as tf

from PIL import Image, ImageOps, UnidentifiedImageError

# ============================================================
# 1. PATHS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "injury_classifier.keras"
)

CLASS_NAMES_PATH = os.path.join(
    BASE_DIR,
    "models",
    "class_names.json"
)

IMAGE_SIZE = (224, 224)

# This is an illustrative abstention threshold,
# not a medically validated confidence threshold.
MIN_SCORE = 0.60

# ============================================================
# 2. LOAD MODEL
# ============================================================

if not os.path.isfile(MODEL_PATH):
    raise FileNotFoundError(
        "Trained model not found. "
        "Run train_injury_model.py first."
    )

model = tf.keras.models.load_model(
    MODEL_PATH
)

# ============================================================
# 3. LOAD CLASS NAMES
# ============================================================

with open(
    CLASS_NAMES_PATH,
    "r",
    encoding="utf-8"
) as file:

    class_names = json.load(file)

# ============================================================
# 4. PREDICTION FUNCTION
# ============================================================

def predict_injury(image_path):

    if not os.path.isfile(image_path):
        raise FileNotFoundError(
            f"Image not found: {image_path}"
        )

    # Load and normalize image orientation.
    with Image.open(image_path) as original:

        image = ImageOps.exif_transpose(
            original
        ).convert("RGB")

        image = image.resize(
            IMAGE_SIZE
        )

        image_array = np.asarray(
            image,
            dtype=np.float32
        )

    # Add batch dimension.
    image_array = np.expand_dims(
        image_array,
        axis=0
    )

    # Predict class scores.
    predictions = model.predict(
        image_array,
        verbose=0
    )[0]

    predicted_index = int(
        np.argmax(predictions)
    )

    predicted_class = class_names[
        predicted_index
    ]

    model_score = float(
        predictions[predicted_index]
    )

    print("\n================================")
    print("FIRST AID GUIDE AI")
    print("IMAGE ASSESSMENT")
    print("================================")

    print(
        f"Predicted category: {predicted_class}"
    )

    print(
        f"Model score: {model_score:.2%}"
    )

    # A low score means the model should abstain.
    if model_score < MIN_SCORE:

        print(
            "\nThe prediction is uncertain. "
            "Please provide more information "
            "and seek professional advice when appropriate."
        )

        return {
            "category": None,
            "raw_prediction": predicted_class,
            "score": model_score,
            "needs_review": True
        }

    print(
        "\nImportant: This is a visual category prediction, "
        "not a medical diagnosis."
    )

    return {
        "category": predicted_class,
        "raw_prediction": predicted_class,
        "score": model_score,
        "needs_review": False
    }


# ============================================================
# 5. RUN FROM TERMINAL
# ============================================================

if __name__ == "__main__":

    if len(sys.argv) < 2:

        print(
            "Usage:\n"
            "python predict_injury.py "
            "\"path/to/injury_image.jpg\""
        )

        sys.exit(1)

    image_path = sys.argv[1]

    try:

        result = predict_injury(
            image_path
        )

        print("\nPrediction result:")
        print(result)

    except (
        FileNotFoundError,
        UnidentifiedImageError,
        OSError
    ) as error:

        print(f"Could not process image: {error}")
        sys.exit(1)