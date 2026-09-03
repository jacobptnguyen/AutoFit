"""Regenerates the sample datasets under data/samples/. Synthetic but
realistically noisy, each with a clear-but-not-trivial predictive
relationship so the auto-picked model has something real to find.

Run with: python3 data/generate_samples.py
"""
import numpy as np
import pandas as pd
from pathlib import Path

OUT = Path(__file__).parent / "samples"
OUT.mkdir(exist_ok=True)
rng = np.random.default_rng(42)


def house_prices(n=400):
    sqft = rng.normal(1800, 650, n).clip(450, 5000)
    bedrooms = rng.integers(1, 6, n)
    bathrooms = rng.integers(1, 4, n)
    age_years = rng.integers(0, 80, n)
    distance_to_city_km = rng.exponential(8, n).clip(0.2, 60)

    price = (
        120 * sqft
        + 15000 * bedrooms
        + 9000 * bathrooms
        - 900 * age_years
        - 2200 * distance_to_city_km
        + rng.normal(0, 35000, n)
        + 40000
    ).clip(50000, None)

    df = pd.DataFrame({
        "sqft": sqft.round(0).astype(int),
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "age_years": age_years,
        "distance_to_city_km": distance_to_city_km.round(1),
        "price": price.round(0).astype(int),
    })
    df.to_csv(OUT / "house_prices.csv", index=False)


def student_performance(n=350):
    study_hours_per_week = rng.gamma(4, 2, n).clip(0, 30)
    attendance_pct = rng.normal(85, 12, n).clip(30, 100)
    sleep_hours = rng.normal(7, 1.3, n).clip(3, 10)
    practice_tests_taken = rng.poisson(3, n)

    exam_score = (
        2.1 * study_hours_per_week
        + 0.35 * attendance_pct
        + 1.8 * sleep_hours
        + 1.4 * practice_tests_taken
        + rng.normal(0, 6, n)
        + 8
    ).clip(0, 100)

    df = pd.DataFrame({
        "study_hours_per_week": study_hours_per_week.round(1),
        "attendance_pct": attendance_pct.round(1),
        "sleep_hours": sleep_hours.round(1),
        "practice_tests_taken": practice_tests_taken,
        "exam_score": exam_score.round(1),
    })
    df.to_csv(OUT / "student_performance.csv", index=False)


def retail_sales(n=300):
    ad_spend = rng.gamma(5, 40, n).clip(0, 1200)
    foot_traffic = rng.normal(400, 130, n).clip(20, 1000)
    discount_pct = rng.choice([0, 5, 10, 15, 20, 25], n, p=[0.35, 0.2, 0.2, 0.12, 0.08, 0.05])
    day_of_week = rng.integers(0, 7, n)
    weekend_boost = np.where(np.isin(day_of_week, [5, 6]), 1, 0)

    daily_sales = (
        3.2 * ad_spend
        + 9.5 * foot_traffic
        + 180 * discount_pct
        + 900 * weekend_boost
        + rng.normal(0, 900, n)
        + 500
    ).clip(0, None)

    df = pd.DataFrame({
        "ad_spend": ad_spend.round(0).astype(int),
        "foot_traffic": foot_traffic.round(0).astype(int),
        "discount_pct": discount_pct,
        "day_of_week": day_of_week,
        "daily_sales": daily_sales.round(0).astype(int),
    })
    df.to_csv(OUT / "retail_sales.csv", index=False)


if __name__ == "__main__":
    house_prices()
    student_performance()
    retail_sales()
    print(f"Wrote sample datasets to {OUT}")
