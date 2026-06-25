# ADR-004: No Stored Procedures for Data Logic

## Status
Accepted — 2026-06-05

## Context
Complex operations like grading assessments and calculating time-bonuses require significant data manipulation. This logic could be pushed to the database via PostgreSQL stored procedures, or handled in the application layer (NestJS).

## Decision
All business logic, including complex grading and statistics aggregation, will reside in the application layer (TypeScript/NestJS). Stored procedures and triggers will be strictly avoided.

## Reasoning
- Code resides in a single, version-controlled repository.
- Easier to unit test and mock business logic using Jest.
- Prevents vendor lock-in to PostgreSQL-specific PL/pgSQL syntax.
- Easier for TypeScript developers to read, debug, and maintain.

## Consequences
- Data must be pulled into memory to be processed, which may require careful query tuning (e.g., using `QueryBuilder` for aggregations) to prevent memory bloat.
- Multiple trips to the database may be required for complex transactions, necessitating proper transaction management (`QueryRunner`).
