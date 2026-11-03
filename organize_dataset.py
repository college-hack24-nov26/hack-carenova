import os
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATASET_DIR = os.path.join(BASE_DIR, "image_dataset")

SPLITS = ["train", "validation", "test"]

# Map existing image filenames to class names.
CLASS_MAPPING = {
    "animal_bite.jpg": "animal_bite",
    "cuts and wounds.webp": "cuts_wounds",
    "knee_injuries.png": "knee_injury",
    "skin burn.jpg": "skin_burn",
    "snake_bite.png": "snake_bite",
}

for split in SPLITS:

    split_dir = os.path.join(DATASET_DIR, split)

    if not os.path.isdir(split_dir):
        print(f"Skipping missing directory: {split_dir}")
        continue

    print(f"\nOrganizing {split}...")

    for filename, class_name in CLASS_MAPPING.items():

        source = os.path.join(split_dir, filename)

        # Skip files that are already inside class folders.
        if not os.path.isfile(source):
            continue

        class_dir = os.path.join(split_dir, class_name)

        os.makedirs(class_dir, exist_ok=True)

        destination = os.path.join(class_dir, filename)

        shutil.move(source, destination)

        print(f"Moved: {filename} -> {class_name}")

print("\nDataset organization completed!")