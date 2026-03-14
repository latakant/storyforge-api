# StoryForge — Invariant Memory
> Quick Reference — read first 25 lines every session

## HARD HALTS (never violate)
- Slug NEVER changes after article is PUBLISHED
- Content edits ALWAYS create new Revision — never overwrite
- Claps/likes are events — never mutable counters
- Financial ops (if any) require $transaction

## DOMAIN LAWS (cms-content adapter active)
- Article state machine: DRAFT → SUBMITTED → PUBLISHED → ARCHIVED
- Comment state machine: PENDING → APPROVED → REJECTED
- Revisions: append-only, linked to Article, immutable after creation

## ARCHITECTURE
- Controller → Service → Prisma (never skip layers)
- No `any` in TypeScript
- DTOs on all inputs with class-validator
- Guards: JwtAuthGuard → RolesGuard (order matters)
