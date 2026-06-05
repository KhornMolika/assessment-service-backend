# ADR-007: Provider-Agnostic Grading Architecture

## Status
Accepted — 2026-06-05

## Context
While Gemini is the default AI grading provider (ADR-006), AI models evolve rapidly. Hardcoding the Google GenAI SDK throughout the grading service would make future migrations difficult.

## Decision
Implement a Provider-Agnostic AI Adapter layer. The background Bull queue worker communicates with an interface (`IAiProvider`), which is resolved at runtime based on the `AI_PROVIDER` environment variable.

## Reasoning
- Prevents vendor lock-in.
- Allows switching to Claude, DeepSeek, OpenAI, or local Ollama instances instantly by changing an environment variable and restarting the container.
- Simplifies unit testing (we can inject a mock provider that implements the interface without hitting actual LLM endpoints).

## Consequences
- Introduces an abstraction layer that must standardize the lowest common denominator of features (e.g., passing system instructions and user prompts, parsing JSON).
- Each new provider requires writing a specific adapter class that conforms to the interface.
