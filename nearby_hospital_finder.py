import pandas as pd
import nltk
import re
from pathlib import Path
from urllib.parse import quote




try :
    nltk.data.find("tokenizers/punkt")
except LookupError:
    nltk.download("punkt", quiet=True)

DATA_PATH = Path("phaltan_taluka_hospitals.csv")

def load_hospital_data():

    df = pd.read_csv(DATA_PATH)

    df.columns = df.columns.str.strip()

    df = df.drop_duplicates(
        subset=["Hospital Name", "Address"]
    )

    return df.reset_index(drop=True)

def preprocess_text(text):

    text = str(text).lower()
    text = re.sub(r"[^\w\s]", " ", text)
    words = nltk.wordpunct_tokenize(text)

    return words

def search_hospitals(df, search_text="", hospital_type="All"):

    result = df.copy()

    search_words = preprocess_text(search_text)

    if search_words:

        def matches_hospital(row):

            hospital_text = (
                row["Hospital Name"] + " " +
                row['Address'] + " " +
                row["Pincode"] + " " +
                row["Type of Hospitals"]
            )

            hospital_words = preprocess_text(hospital_text)

            result = result[
                result.apply(matches_hospital, axis=1)
            ]

        if hospital_type and hospital_type != "All":

            result = result[
                result["Type of Hospital"].str.lower()
                == hospital_type.lower()
            ]


        return result.reset_index(drop=True)

def get_hospital_types(df):

    types = df["Type of Hospital"].dropna().str.strip()

    categories = sorted([
        value for value in types.unique()
        if value
    ])


def get_google_maps_url(hospital_name, address):

    query = f"{hospital_name}, {address}"

    return (
        "https://www.google.com/maps/search/?api=1&query=" 
        + quote(query) 
    )