import json
import os

import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.exceptions import HTTPException

from .fit import FitError, fit_and_evaluate
from .profiling import profile_dataframe
from .quality_heuristics import compute_quality_heuristics
from .reasoning import ReasoningError, reason_about_dataset
from .samples import SAMPLES, load_sample
from .validation import ConfigValidationError, validate_config

MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB
MAX_ROWS = 50_000


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH
    app.json.sort_keys = False  # preserve the metric/rationale order Claude chose

    CORS(app, origins=os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000"))

    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=[],
        storage_uri=os.environ.get("RATE_LIMIT_STORAGE_URI", "memory://"),
    )

    @app.errorhandler(HTTPException)
    def handle_http_exception(e: HTTPException):
        # Flask/Werkzeug's default error pages are HTML; every response from this
        # API must be JSON, or the Next.js proxy's response.json() call breaks.
        return jsonify({"error": e.description}), e.code

    @app.errorhandler(Exception)
    def handle_unexpected_exception(e: Exception):
        app.logger.exception("Unhandled exception")
        return jsonify({"error": "Internal server error"}), 500

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    @app.get("/api/samples")
    def list_samples():
        return jsonify({"samples": [{"id": s["id"], "name": s["name"], "description": s["description"]} for s in SAMPLES]})

    @app.post("/api/analyze")
    @limiter.limit("10 per minute")
    def analyze():
        try:
            df = _load_dataframe_from_request()
        except _RequestDataError as exc:
            return jsonify({"error": str(exc)}), 400

        if len(df) == 0:
            return jsonify({"error": "Dataset has no data rows"}), 400
        if len(df) > MAX_ROWS:
            return jsonify({"error": f"Dataset has {len(df)} rows, which exceeds the {MAX_ROWS}-row limit"}), 400
        if len(df.columns) < 2:
            return jsonify({"error": "Dataset needs at least two columns to find a relationship"}), 400

        profile = profile_dataframe(df)
        quality_heuristics = compute_quality_heuristics(df)

        try:
            analysis = reason_about_dataset(profile, quality_heuristics)
        except ReasoningError as exc:
            return jsonify({"error": f"Could not analyze this dataset: {exc}"}), 502

        try:
            fit_result = fit_and_evaluate(df, analysis)
        except FitError as exc:
            return jsonify({"error": f"Could not fit a model: {exc}"}), 422

        return jsonify({
            "quality": {
                "rating": analysis["quality_rating"],
                "rationale": analysis["quality_rationale"],
                "heuristics": quality_heuristics,
            },
            "results": {
                "target_variable": analysis["target_variable"],
                "feature_variables": analysis["feature_variables"],
                "task_type": analysis["task_type"],
                "model": analysis["model"],
                "modeling_rationale": analysis["modeling_rationale"],
                "source": "auto",
                **fit_result,
            },
            "dataset": {"row_count": len(df), "column_count": len(df.columns)},
            "columns": [
                {"name": c["name"], "kind": c["kind"], "unique_count": c["unique_count"]}
                for c in profile["columns"]
            ],
        })

    @app.post("/api/refit")
    @limiter.limit("30 per minute")  # no Claude call here, just a scikit-learn fit
    def refit():
        try:
            df = _load_dataframe_from_request()
        except _RequestDataError as exc:
            return jsonify({"error": str(exc)}), 400

        if len(df) == 0:
            return jsonify({"error": "Dataset has no data rows"}), 400
        if len(df) > MAX_ROWS:
            return jsonify({"error": f"Dataset has {len(df)} rows, which exceeds the {MAX_ROWS}-row limit"}), 400

        config = _extract_config_from_request()
        if config is None:
            return jsonify({"error": "Missing config"}), 400

        try:
            validate_config(config, set(df.columns))
        except ConfigValidationError as exc:
            return jsonify({"error": str(exc)}), 400

        try:
            fit_result = fit_and_evaluate(df, config)
        except FitError as exc:
            return jsonify({"error": f"Could not fit a model: {exc}"}), 422

        return jsonify({
            "results": {
                "target_variable": config["target_variable"],
                "feature_variables": config["feature_variables"],
                "task_type": config["task_type"],
                "model": config["model"],
                "modeling_rationale": None,
                "source": "manual",
                **fit_result,
            },
        })

    return app


class _RequestDataError(Exception):
    pass


def _load_dataframe_from_request() -> pd.DataFrame:
    if "file" in request.files:
        file = request.files["file"]
        if not file.filename:
            raise _RequestDataError("No file selected")
        try:
            return pd.read_csv(file.stream)
        except Exception as exc:
            raise _RequestDataError(f"Could not parse CSV: {exc}") from exc

    payload = request.get_json(silent=True) or {}
    sample_id = payload.get("sample_id")
    if sample_id:
        try:
            return load_sample(sample_id)
        except KeyError:
            raise _RequestDataError(f"Unknown sample_id: {sample_id}")

    raise _RequestDataError("Provide a CSV file upload or a sample_id")


def _extract_config_from_request() -> dict | None:
    if "file" in request.files:
        raw = request.form.get("config")
        if not raw:
            return None
        try:
            return json.loads(raw)
        except ValueError:
            return None

    payload = request.get_json(silent=True) or {}
    config = payload.get("config")
    return config if isinstance(config, dict) else None
