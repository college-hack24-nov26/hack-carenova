# ============================================================
# FIRST AID GUIDE AI
# Injury Image Classification using MobileNetV2
# ============================================================

import os
import json
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt

from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay
)

# ============================================================
# 1. CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATASET_DIR = os.path.join(BASE_DIR, "image_dataset")

TRAIN_DIR = os.path.join(DATASET_DIR, "train")
VAL_DIR = os.path.join(DATASET_DIR, "validation")
TEST_DIR = os.path.join(DATASET_DIR, "test")

MODEL_DIR = os.path.join(BASE_DIR, "models")

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "injury_classifier.keras"
)

CLASS_NAMES_PATH = os.path.join(
    MODEL_DIR,
    "class_names.json"
)

IMAGE_SIZE = (224, 224)
BATCH_SIZE = 16
INITIAL_EPOCHS = 15
SEED = 42

os.makedirs(MODEL_DIR, exist_ok=True)

tf.keras.utils.set_random_seed(SEED)

# ============================================================
# 2. CHECK DATASET DIRECTORIES
# ============================================================

for directory in [TRAIN_DIR, VAL_DIR, TEST_DIR]:

    if not os.path.isdir(directory):
        raise FileNotFoundError(
            f"Dataset directory not found: {directory}"
        )

print("\nDataset directories verified.")

# ============================================================
# 3. LOAD TRAINING DATA
# ============================================================

train_ds = tf.keras.utils.image_dataset_from_directory(
    TRAIN_DIR,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
    shuffle=True,
    seed=SEED
)

class_names = train_ds.class_names

if len(class_names) < 2:
    raise ValueError(
        "At least two class folders are required."
    )

NUM_CLASSES = len(class_names)

print("\nDetected classes:")

for index, class_name in enumerate(class_names):
    print(f"{index}: {class_name}")

# ============================================================
# 4. LOAD VALIDATION DATA
# ============================================================

val_ds = tf.keras.utils.image_dataset_from_directory(
    VAL_DIR,
    class_names=class_names,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
    shuffle=False
)

# ============================================================
# 5. LOAD TEST DATA
# ============================================================

test_ds = tf.keras.utils.image_dataset_from_directory(
    TEST_DIR,
    class_names=class_names,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
    shuffle=False
)

# ============================================================
# 6. CHECK FOR EMPTY DATASETS
# ============================================================

if (
    tf.data.experimental.cardinality(train_ds).numpy() == 0
    or tf.data.experimental.cardinality(val_ds).numpy() == 0
    or tf.data.experimental.cardinality(test_ds).numpy() == 0
):
    raise ValueError(
        "Training, validation, and test datasets must "
        "all contain images."
    )

# ============================================================
# 7. DATA AUGMENTATION
# ============================================================

data_augmentation = tf.keras.Sequential(
    [
        tf.keras.layers.RandomFlip("horizontal"),
        tf.keras.layers.RandomRotation(0.05),
        tf.keras.layers.RandomZoom(0.10),
    ],
    name="data_augmentation"
)

# ============================================================
# 8. LOAD MOBILENETV2
# ============================================================

print("\nLoading MobileNetV2 pretrained weights...")

base_model = tf.keras.applications.MobileNetV2(
    input_shape=(224, 224, 3),
    include_top=False,
    weights="imagenet"
)

# Freeze the pretrained layers initially.
base_model.trainable = False

# ============================================================
# 9. BUILD CLASSIFICATION MODEL
# ============================================================

inputs = tf.keras.Input(
    shape=(224, 224, 3),
    name="input_image"
)

# Augmentation is active during training only.
x = data_augmentation(inputs)

# MobileNetV2 expects pixel values approximately in [-1, 1].
x = tf.keras.layers.Rescaling(
    scale=1.0 / 127.5,
    offset=-1.0
)(x)

# Extract image features.
x = base_model(x, training=False)

# Convert feature maps into a feature vector.
x = tf.keras.layers.GlobalAveragePooling2D()(x)

x = tf.keras.layers.Dropout(0.30)(x)

# Predict one of the injury categories.
outputs = tf.keras.layers.Dense(
    NUM_CLASSES,
    activation="softmax",
    name="injury_predictions"
)(x)

model = tf.keras.Model(
    inputs=inputs,
    outputs=outputs,
    name="first_aid_injury_classifier"
)

# ============================================================
# 10. COMPILE MODEL
# ============================================================

model.compile(
    optimizer=tf.keras.optimizers.Adam(
        learning_rate=0.001
    ),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)

model.summary()

# ============================================================
# 11. CALLBACKS
# ============================================================

callbacks = [
    tf.keras.callbacks.EarlyStopping(
        monitor="val_loss",
        patience=4,
        restore_best_weights=True
    ),

    tf.keras.callbacks.ModelCheckpoint(
        filepath=MODEL_PATH,
        monitor="val_loss",
        save_best_only=True,
        verbose=1
    ),

    tf.keras.callbacks.ReduceLROnPlateau(
        monitor="val_loss",
        factor=0.2,
        patience=2,
        min_lr=1e-7,
        verbose=1
    )
]

# ============================================================
# 12. OPTIMIZE DATA LOADING
# ============================================================

AUTOTUNE = tf.data.AUTOTUNE

train_ds = train_ds.prefetch(
    buffer_size=AUTOTUNE
)

val_ds = val_ds.prefetch(
    buffer_size=AUTOTUNE
)

test_ds = test_ds.prefetch(
    buffer_size=AUTOTUNE
)

# ============================================================
# 13. TRAIN MODEL
# ============================================================

print("\nStarting model training...")

history = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=INITIAL_EPOCHS,
    callbacks=callbacks
)

# ============================================================
# 14. LOAD BEST SAVED MODEL
# ============================================================

print("\nLoading best saved model...")

model = tf.keras.models.load_model(
    MODEL_PATH
)

# ============================================================
# 15. EVALUATE ON TEST DATA
# ============================================================

print("\nEvaluating on the test dataset...")

test_loss, test_accuracy = model.evaluate(
    test_ds,
    verbose=1
)

print(f"\nTest Loss: {test_loss:.4f}")
print(f"Test Accuracy: {test_accuracy:.4f}")
print(
    f"Test Accuracy Percentage: "
    f"{test_accuracy * 100:.2f}%"
)

# ============================================================
# 16. GENERATE CLASSIFICATION REPORT
# ============================================================

y_true = []
y_pred = []

for images, labels in test_ds:

    predictions = model.predict(
        images,
        verbose=0
    )

    predicted_classes = np.argmax(
        predictions,
        axis=1
    )

    y_true.extend(labels.numpy().tolist())
    y_pred.extend(predicted_classes.tolist())

print("\nClassification Report:")

print(
    classification_report(
        y_true,
        y_pred,
        labels=list(range(NUM_CLASSES)),
        target_names=class_names,
        zero_division=0
    )
)

# ============================================================
# 17. CONFUSION MATRIX
# ============================================================

cm = confusion_matrix(
    y_true,
    y_pred,
    labels=list(range(NUM_CLASSES))
)

display = ConfusionMatrixDisplay(
    confusion_matrix=cm,
    display_labels=class_names
)

fig, ax = plt.subplots(figsize=(10, 8))

display.plot(
    ax=ax,
    xticks_rotation=45,
    values_format="d"
)

plt.title("First Aid Injury Classification")
plt.tight_layout()

confusion_matrix_path = os.path.join(
    MODEL_DIR,
    "confusion_matrix.png"
)

plt.savefig(confusion_matrix_path)
plt.show()

# ============================================================
# 18. SAVE CLASS NAMES
# ============================================================

with open(
    CLASS_NAMES_PATH,
    "w",
    encoding="utf-8"
) as file:

    json.dump(
        class_names,
        file,
        indent=4
    )

# ============================================================
# 19. TRAINING COMPLETE
# ============================================================

print("\n===================================")
print("MODEL TRAINING COMPLETED")
print("===================================")

print(f"Model saved: {MODEL_PATH}")
print(f"Classes saved: {CLASS_NAMES_PATH}")
print(f"Confusion matrix: {confusion_matrix_path}")

print("\nSupported categories:")

for class_name in class_names:
    print("-", class_name)

print("\nNext: Run predict_injury.py")