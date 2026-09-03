from pathlib import Path

import pandas as pd

SAMPLES_DIR = Path(__file__).parent.parent / "data" / "samples"

SAMPLES = [
    {
        "id": "house_prices",
        "name": "House Prices",
        "description": "Home sale prices vs. size, bedrooms, age, and location.",
        "file": "house_prices.csv",
    },
    {
        "id": "student_performance",
        "name": "Student Performance",
        "description": "Exam scores vs. study habits, attendance, and sleep.",
        "file": "student_performance.csv",
    },
    {
        "id": "retail_sales",
        "name": "Retail Sales",
        "description": "Daily sales vs. ad spend, foot traffic, and discounts.",
        "file": "retail_sales.csv",
    },
]

_BY_ID = {s["id"]: s for s in SAMPLES}


def load_sample(sample_id: str) -> pd.DataFrame:
    sample = _BY_ID[sample_id]
    return pd.read_csv(SAMPLES_DIR / sample["file"])
