# ADR-006: Defaulting to Gemini for AI Grading

## Status
Accepted — 2026-06-05

## Context
Subjective questions (`SHORT_ANSWER` and `ESSAY`) require human or AI evaluation. We needed to select a default LLM provider for the asynchronous grading queue.

## Decision
Default to Google's `gemini-2.5-flash` model for the automated grading pipeline.

## Reasoning
- **Speed**: The `flash` model is heavily optimized for fast text analysis, crucial for processing high-volume assessment queues.
- **Context Window**: Supports large context windows, allowing it to evaluate very long essay submissions without truncation.
- **Structured Output**: Exceptional at following strict JSON-schema output requirements (returning exact `score` and `reasoning` structures).
- **Cost**: Highly cost-effective for bulk background processing compared to heavier models.

## Consequences
- Requires a `GEMINI_API_KEY` in the environment.
- In edge cases involving highly nuanced domain logic, the flash model may require more explicit grading rubrics than a larger model (like `gemini-1.5-pro` or `gpt-4o`). We will support a manual override (`manualGradingAIQues: true`) to fallback to human graders.
