"""The single Claude call that does everything a data scientist would
normally do by hand: pick the target, pick the features, pick a model,
pick evaluation metrics, and rate the dataset - all from the column
profile, never the raw data.
"""
import json
import os

import anthropic

from .validation import (
    CLASSIFICATION_METRICS,
    ConfigValidationError,
    MODEL_SHORTLIST,
    REGRESSION_METRICS,
    validate_config,
)

CLAUDE_MODEL = os.environ.get("AUTOFIT_CLAUDE_MODEL", "claude-sonnet-5")

_SYSTEM_PROMPT = """You are the reasoning engine inside AutoFit, a tool that lets \
someone with zero machine learning knowledge upload a raw CSV and get back a \
working predictive model with no configuration. You are given a column-level \
profile of the dataset (not the raw data) plus some deterministic data-quality \
heuristics. From this alone you must decide, the way an experienced data \
scientist would:

1. Which column is the most sensible target (dependent variable) to predict.
2. Which columns are useful predictors (independent variables) - drop \
   obvious non-predictive columns like IDs, and never include the target \
   column itself in this list.
3. Whether this is a regression or classification problem.
4. Which single model from the shortlist fits best, given the data's size, \
   shape, and target type.
5. Which evaluation metric(s) are actually appropriate here - do not \
   default to accuracy for an imbalanced classification target, and prefer \
   metrics a non-expert can still interpret when the choice is close.
6. A data quality rating from 1 to 5 (5 = clean and trustworthy, 1 = unusable), \
   weighing the completeness heuristics and the likelihood this data was \
   synthetically or AI-generated rather than collected from the real world.

Always respond by calling the submit_analysis tool. Keep every rationale to \
1-3 plain-English sentences a non-technical person can follow."""

_TOOL = {
    "name": "submit_analysis",
    "description": "Submit the modeling plan and data quality assessment.",
    "input_schema": {
        "type": "object",
        "properties": {
            "target_variable": {"type": "string"},
            "feature_variables": {
                "type": "array",
                "items": {"type": "string"},
                "minItems": 1,
            },
            "task_type": {"type": "string", "enum": ["regression", "classification"]},
            "model": {"type": "string", "enum": MODEL_SHORTLIST},
            "metrics": {
                "type": "array",
                "items": {"type": "string", "enum": REGRESSION_METRICS + CLASSIFICATION_METRICS},
                "minItems": 1,
                "maxItems": 3,
            },
            "modeling_rationale": {"type": "string"},
            "quality_rating": {"type": "integer", "minimum": 1, "maximum": 5},
            "quality_rationale": {"type": "string"},
        },
        "required": [
            "target_variable", "feature_variables", "task_type", "model",
            "metrics", "modeling_rationale", "quality_rating", "quality_rationale",
        ],
    },
}


class ReasoningError(RuntimeError):
    pass


def reason_about_dataset(profile: dict, quality_heuristics: dict) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ReasoningError("ANTHROPIC_API_KEY is not set")

    client = anthropic.Anthropic(api_key=api_key)

    user_content = (
        "Column profile:\n" + json.dumps(profile, indent=2)
        + "\n\nData quality heuristics:\n" + json.dumps(quality_heuristics, indent=2)
    )

    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=1024,
        system=_SYSTEM_PROMPT,
        tools=[_TOOL],
        tool_choice={"type": "tool", "name": "submit_analysis"},
        messages=[{"role": "user", "content": user_content}],
    )

    for block in response.content:
        if block.type == "tool_use" and block.name == "submit_analysis":
            result = dict(block.input)
            _sanitize_result(result)
            _validate_result(result, profile)
            return result

    raise ReasoningError("Claude did not return a submit_analysis tool call")


def _sanitize_result(result: dict) -> None:
    # The target accidentally showing up in its own feature list is an
    # unambiguous, always-safe fix - drop it rather than failing the whole
    # analysis over something this trivially correctable.
    target = result.get("target_variable")
    features = result.get("feature_variables") or []
    if target in features:
        result["feature_variables"] = [f for f in features if f != target]


def _validate_result(result: dict, profile: dict) -> None:
    columns = {c["name"] for c in profile["columns"]}
    try:
        validate_config(result, columns)
    except ConfigValidationError as exc:
        raise ReasoningError(f"Claude's analysis was invalid: {exc}") from exc
