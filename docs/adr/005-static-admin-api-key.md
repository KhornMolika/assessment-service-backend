# ADR-005: Static Admin API Key for Split-Tier Security

## Status
Accepted — 2026-06-05

## Context
Clients (tenants) need to be able to manage their own settings (like Webhooks), but administrative actions (like creating new clients, suspending tenants, or rotating secrets) must be restricted strictly to NBFSA operators. 
Initially, an `isSuperAdmin` boolean on the database was considered.

## Decision
Use a static `ADMIN_API_KEY` injected via environment variables, validated by a `SuperAdminGuard` via constant-time string comparison, rather than an `isSuperAdmin` database flag.

## Reasoning
- Avoids the "chicken-and-egg" bootstrap problem (needing an admin to create an admin).
- Simplifies architecture: the API key works on day zero without seeding the database.
- Highly secure when the key has high entropy and is managed via a secure vault/environment.
- Clear separation of concerns in the `ClientController` (JWT for `/me` tenant self-service vs. `x-admin-api-key` for `/:id` administrative actions).

## Consequences
- If the `ADMIN_API_KEY` is compromised, all tenants are compromised. It must be rotated securely.
- Requires passing the custom `x-admin-api-key` header explicitly for admin commands instead of standard Bearer tokens.
