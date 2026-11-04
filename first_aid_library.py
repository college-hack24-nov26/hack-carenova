import json

with open("first_aid_library.json", "r", encoding="utf-8") as file:
    library = json.load(file)

for topic in library.get("topics", []):
    print(f"\nTopic: {topic.get('title', 'Untitled')}")

    english = topic.get("languages", {}).get("en", {})
    print("Description:", english.get("description", "Not available"))

    for i, step in enumerate(english.get("steps", []), 1):
        print(f"{i}. {step}")
