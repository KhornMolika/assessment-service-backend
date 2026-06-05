# ADR-001: OAuth2 Client Credentials Grant

## Status
Accepted — 2026-06-05

## Context
The Assessment Service Backend acts as a headless API for NBFSA partners and internal platforms. There are no direct human users authenticating to the API; instead, partner servers communicate on behalf of their users.

## Decision
Use the OAuth2 Client Credentials Grant flow (`grant_type=client_credentials`).

## Reasoning
- Standardized approach for machine-to-machine (M2M) communication.
- Decouples API authentication from end-user authentication (which is handled by the partner).
- Stateless JWTs reduce database lookups.
- Well-supported by existing libraries (e.g., Passport.js).

## Consequences
- Requires issuing and securely storing `clientId` and `clientSecret`.
- The partner system is fully responsible for securing its tokens.
- We must provide a `/auth/token` endpoint and strictly rate-limit it.
