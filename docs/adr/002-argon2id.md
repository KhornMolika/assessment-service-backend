# ADR-002: Argon2id over bcrypt for secret hashing

## Status
Accepted — 2026-06-05

## Context
We need to hash `clientSecrets` at rest. The two primary candidates for password/secret hashing in Node.js are bcrypt and argon2id.

## Decision
Use argon2id with `memoryCost: 65536` (64MB), `timeCost: 3`, and `parallelism: 1`.

## Reasoning
- Argon2id won the Password Hashing Competition (2015).
- Memory-hard — resists GPU/ASIC brute force attacks.
- OWASP recommended over bcrypt.
- bcrypt has no memory hardness and is becoming vulnerable to modern GPU cracking.

## Consequences
- Each hash/verify operation uses 64MB of RAM.
- `POST /auth/token` must be tightly rate-limited to prevent memory exhaustion DDOS.
- Requires the `argon2` npm package.

## Alternatives considered
- **bcrypt**: Rejected due to lack of memory hardness and weak GPU resistance.
- **scrypt**: Rejected because argon2id is strictly better and more widely recommended by security experts.
