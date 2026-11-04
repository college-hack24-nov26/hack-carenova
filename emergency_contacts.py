"""
Emergency Contacts Logic
First Aid Guide AI

Functions:
1. Load contacts
2. Save contacts
3. Add and delete contacts
4. Create emergency messages
5. Screen for possible emergencies using ML and rules
"""

import json
import re
from pathlib import Path
from urllib.parse import quote

from emergency_detection import screen_emergency


# File used to store emergency contacts
CONTACT_FILE = Path(__file__).resolve().parent / "emergency_contacts.json"


# 1. LOAD CONTACTS
def load_contacts():
    if not CONTACT_FILE.exists():
        return []

    try:
        with open(CONTACT_FILE, "r", encoding="utf-8") as file:
            contacts = json.load(file)

        return contacts if isinstance(contacts, list) else []

    except (json.JSONDecodeError, OSError):
        return []


# 2. SAVE CONTACTS
def save_contacts(contacts):
    with open(CONTACT_FILE, "w", encoding="utf-8") as file:
        json.dump(contacts, file, indent=4, ensure_ascii=False)


# 3. VALIDATE CONTACT
def validate_contact(name, phone, contacts):
    name = (name or "").strip()
    phone = (phone or "").strip()

    if not name:
        return "Please enter a name."

    if not re.fullmatch(r"\+?[0-9][0-9\s()-]{5,18}", phone):
        return "Please enter a valid-looking phone number."

    # Normalize the phone number
    normalized_phone = re.sub(r"[\s()-]", "", phone)

    for contact in contacts:
        saved_phone = re.sub(
            r"[\s()-]",
            "",
            contact.get("phone", "")
        )

        if normalized_phone == saved_phone:
            return "This phone number already exists."

    return None


# 4. ADD CONTACT
def add_contact(name, relationship, phone):
    contacts = load_contacts()

    error = validate_contact(name, phone, contacts)

    if error:
        return False, error

    contact = {
        "name": name.strip(),
        "relationship": (relationship or "").strip(),
        "phone": phone.strip()
    }

    contacts.append(contact)

    try:
        save_contacts(contacts)

    except OSError:
        return False, "Unable to save the contact."

    return True, "Emergency contact added successfully."


# 5. DELETE CONTACT
def delete_contact(index):
    contacts = load_contacts()

    if index < 0 or index >= len(contacts):
        return False

    contacts.pop(index)

    try:
        save_contacts(contacts)

    except OSError:
        return False

    return True


# 6. CREATE EMERGENCY MESSAGE
def prepare_alert_message(contact, situation):
    name = contact.get("name", "there")
    situation = (situation or "").strip() or "Help needed"

    return (
        "EMERGENCY ALERT\n\n"
        f"Hello {name},\n"
        "I may need assistance.\n\n"
        f"Situation: {situation}\n\n"
        "Please contact me as soon as possible."
    )


# 7. CREATE SMS LINK
def make_sms_link(phone, message):
    phone = re.sub(r"[\s()-]", "", phone)

    return f"sms:{phone}?body={quote(message)}"


# 8. CHECK POSSIBLE EMERGENCY
def check_emergency(description):
    # Use the ML model and rule-based screening
    result = screen_emergency(description)

    # Return a consistent result for the application
    return {
        "emergency": result.get("emergency", False),
        "level": result.get("level", "unknown"),
        "message": result.get("message", ""),
        "categories": result.get("categories", []),
        "disclaimer": (
            "This screening is not a medical diagnosis and may miss "
            "emergencies. If symptoms are severe, sudden, or concerning, "
            "seek urgent medical help."
        )
    }


# 9. TEST THE FUNCTIONS
if __name__ == "__main__":
    print("Emergency Contacts Module")

    contacts = load_contacts()
    print("Saved contacts:", len(contacts))

    description = input(
        "\nDescribe the emergency situation: "
    ).strip()

    result = check_emergency(description)

    print("\nEmergency Screening Result")
    print("--------------------------")
    print("Emergency:", result["emergency"])
    print("Level:", result["level"])
    print("Categories:", result["categories"])
    print("Message:", result["message"])
    print("Disclaimer:", result["disclaimer"])
