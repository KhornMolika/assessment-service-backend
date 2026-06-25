# ADR-003: Redis-Backed Throttler for Rate Limiting

## Status
Accepted — 2026-06-05

## Context
APIs require protection against abuse, brute forcing (especially on the auth endpoint), and excessive load. Since the service is designed to scale horizontally across multiple instances, an in-memory rate limiter would be ineffective.

## Decision
Use `@nestjs/throttler` backed by Redis (`@nest-lab/throttler-storage-redis`) for distributed rate limiting. The rate limits will be applied based on the authenticated `clientId`, falling back to the IP address for public endpoints.

## Reasoning
- Redis provides a centralized, high-performance datastore for tracking request counts across all scaled instances.
- Tracking by `clientId` ensures fairness across tenants (one noisy tenant cannot exhaust another's limit).
- The NestJS throttler provides granular control (different limits for auth vs. read vs. write).

## Consequences
- Redis becomes a hard dependency for API operation.
- If Redis goes down, rate limiting fails open (or closed, depending on configuration), requiring manual abuse monitoring.
