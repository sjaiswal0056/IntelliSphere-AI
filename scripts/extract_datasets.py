"""
IntelliSphere AI — Dataset Extraction Utility
Extracts source zip archives into data/raw for repeatable pipelines.
"""

import os
import zipfile
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARENT_DIR = os.path.dirname(BASE_DIR)
RAW_DATA_DIR = os.path.join(BASE_DIR, "data", "raw")

DATASET_MAPPINGS = [
    {
        "zip_name": "ai4i+2020+predictive+maintenance+dataset.zip",
        "target_subfolder": "",
        "description": "UCI AI4I 2020 Predictive Maintenance Dataset"
    },
    {
        "zip_name": "archive (1).zip",
        "target_subfolder": "",
        "description": "Credit Card Fraud Detection Dataset"
    },
    {
        "zip_name": "heart+disease.zip",
        "target_subfolder": "heart_disease",
        "description": "UCI Heart Disease Dataset"
    },
    {
        "zip_name": "ml-latest-small.zip",
        "target_subfolder": "",
        "description": "MovieLens Latest Small Dataset"
    },
    {
        "zip_name": "online+retail+ii.zip",
        "target_subfolder": "",
        "description": "UCI Online Retail II Dataset"
    }
]

def extract_all():
    os.makedirs(RAW_DATA_DIR, exist_ok=True)
    print(f"[*] Extracting datasets to {RAW_DATA_DIR}...")

    for item in DATASET_MAPPINGS:
        zip_path = os.path.join(PARENT_DIR, item["zip_name"])
        if not os.path.exists(zip_path):
            # check in RAW_DATA_DIR as well
            zip_path = os.path.join(RAW_DATA_DIR, item["zip_name"])

        if not os.path.exists(zip_path):
            print(f"[!] Warning: {item['zip_name']} not found at {zip_path}. Skipping.")
            continue

        target_dir = os.path.join(RAW_DATA_DIR, item["target_subfolder"]) if item["target_subfolder"] else RAW_DATA_DIR
        os.makedirs(target_dir, exist_ok=True)

        print(f"[+] Extracting {item['description']} ({item['zip_name']})...")
        try:
            with zipfile.ZipFile(zip_path, 'r') as zf:
                zf.extractall(target_dir)
            print(f"    Successfully extracted to {target_dir}")
        except Exception as e:
            print(f"    [!] Error extracting {item['zip_name']}: {e}")

    print("[*] Extraction complete.")

if __name__ == "__main__":
    extract_all()
