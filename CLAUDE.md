# StoryForge — Principal Architect Context
# Cortex test project · CMS / Publishing Platform
# Created: 2026-03-14

## 0. SNAPSHOT

Blogging / publishing platform · MVP planned · pre-build · Solo
Stack: NestJS 10 · Prisma · TypeScript · Next.js 15 · React 19 · Tailwind 4

## 1. ACTORS

- Reader — discovers and reads articles
- Writer — creates and publishes articles
- Editor — reviews and approves submissions
- Admin — manages platform, users, tags

## 2. CORE BUSINESS RULES

**Article lifecycle:** DRAFT → SUBMITTED → PUBLISHED → ARCHIVED
- Slug is immutable once published — never change after PUBLISHED
- Edits create new Revision, never overwrite content (append-only)
- Claps/likes are append-only events, not counters (count at read time)
- Comments are moderated — PENDING → APPROVED → REJECTED

## 3. STACK

Backend:  NestJS · Prisma · PostgreSQL · BullMQ · JWT
Frontend: Next.js 15 (App Router) · React 19 · Tailwind 4 · React Query 5

## 4. GOVERNANCE

CORTEX CERTIFIED — all AI work governed by Cortex v12.0.
- Every session: /cert-session
- Every code change: /cert-commit
- New project: /cortex-plan new "StoryForge"
- Adapters active: cms-content · nestjs-patterns · nextjs-patterns · shared tools
