# StoryForge — Product Requirements Document
> Version 1.0 · 2026-03-15 · MVP Complete · Pre-launch

---

## 1. Overview

**StoryForge** is a blogging and publishing platform for independent writers. It provides editorial workflow tooling (submission → review → publication), reader engagement (claps, threaded comments, follow graph), and content discovery.

**Status:** MVP backend complete. All 67 user stories verified E2E. Frontend (Next.js) not yet built.

---

## 2. Actors & Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **READER** | Consumes content | Read public content, clap, comment (after moderation), follow writers |
| **WRITER** | Creates content | Create/edit/submit/archive own articles |
| **EDITOR** | Editorial gatekeeper | Approve/reject submissions, moderate comments |
| **ADMIN** | Platform operator | Manage users, tags, view stats, full moderation access |

---

## 3. Article Lifecycle

```
DRAFT ──submit──► SUBMITTED ──publish──► PUBLISHED ──archive──► ARCHIVED
  ▲                  │
  └──────reject───────┘
```

**Rules:**
- Writers can only `submit` from DRAFT
- Editors can `publish` or `reject` from SUBMITTED; `reject` returns article to DRAFT with `editorNote`
- Writers can `archive` from PUBLISHED
- **Slug is immutable once set** — never changes after creation (even post-publish)
- Content is append-only (Revision model) — old content never overwritten
- DRAFT and ARCHIVED articles are hidden from the public feed

---

## 4. Core Features

### 4.1 Auth (`/auth`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/register` | POST | — | Register with name, email, password |
| `/auth/login` | POST | — | Returns `{ accessToken, refreshToken, user }` |
| `/auth/me` | GET | JWT | Returns current user's profile + role |
| `/auth/refresh` | POST | — | Body: `{ refreshToken }` → returns new `accessToken` |
| `/auth/logout` | POST | JWT | Body: `{ refreshToken }` → invalidates session |

**Token design:**
- Access token: JWT · 15min expiry · signed with `JWT_SECRET`
- Refresh token: opaque UUID · 7-day expiry · stored in `refresh_tokens` table

### 4.2 Articles (`/articles`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/articles` | POST | WRITER+ | Create article: `{ title, content, coverImageUrl? }` |
| `/articles/:slug` | GET | — | Read published article by slug |
| `/articles` | GET | — | List published articles (paginated) |
| `/articles/mine` | GET | WRITER+ | List own articles (all statuses) |
| `/articles/:id` | PATCH | WRITER (owner) | Update `{ title?, coverImageUrl?, tagIds? }` |
| `/articles/:id/content` | PATCH | WRITER (owner) | Add revision: `{ content, editorNote? }` |
| `/articles/:id/revisions` | GET | WRITER (owner) | List revision history |
| `/articles/:id/submit` | POST | WRITER (owner) | DRAFT → SUBMITTED |
| `/articles/:id/publish` | POST | EDITOR/ADMIN | SUBMITTED → PUBLISHED |
| `/articles/:id/reject` | POST | EDITOR/ADMIN | SUBMITTED → DRAFT; body: `{ editorNote }` (min 10 chars) |
| `/articles/:id/archive` | POST | WRITER (owner) | PUBLISHED → ARCHIVED |

### 4.3 Tags (`/tags`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/tags` | POST | ADMIN | Create tag: `{ name }` — slug auto-generated |
| `/tags` | GET | — | List all tags |
| `/tags/:slug` | GET | — | Get tag by slug |

**Notes:** Slug is auto-generated from name (lowercase, hyphenated). Never send `slug` in POST body.

### 4.4 Discovery (`/discovery`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/discovery/articles` | GET | — | Feed of published articles; supports `?tag=slug` filter |
| `/discovery/tags` | GET | — | Tags with article counts |
| `/discovery/trending` | GET | — | Trending articles (clap-weighted) |

### 4.5 Claps (`/articles/:articleId/claps`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `POST` | — | JWT | Add a clap (append-only, no limit per user) |
| `GET` | — | — | Returns `{ articleId, clapCount }` |

**Rate limit:** 50 claps/min per IP (per-route override).

### 4.6 Comments (`/articles/:articleId/comments`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `POST` | — | JWT | Post comment: `{ body, parentId? }` |
| `GET` | — | — | Lists APPROVED comments only |
| `POST /:id/approve` | — | EDITOR+ | PENDING → APPROVED |
| `POST /:id/reject` | — | EDITOR+ | PENDING → REJECTED |
| `DELETE /:id` | — | ADMIN | Hard-delete any comment |

**Rate limit:** 10 comments/hr per IP (per-route override).
**Notes:** Only possible on PUBLISHED articles. New comments start as PENDING.

### 4.7 Social (`/users`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/users/me` | PATCH | JWT | Update own profile: `{ name?, bio?, avatarUrl? }` |
| `/users/me/feed` | GET | JWT | Personalised feed from followed writers |
| `/users/:id/follow` | POST | JWT | Follow a user |
| `/users/:id/follow` | DELETE | JWT | Unfollow a user |

### 4.8 Admin (`/admin`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/admin/stats` | GET | ADMIN | Platform metrics (users, articles, comments) |
| `/admin/users` | GET | ADMIN | List all users |
| `/admin/users/:id/role` | PATCH | ADMIN | Change user role: `{ role }` |
| `/admin/users/:id/toggle` | PATCH | ADMIN | Toggle `isActive` status |
| `/admin/comments/pending` | GET | ADMIN | View pending comment queue |

---

## 5. Data Model (Key Tables)

```
users            → id, email, passwordHash, role, name, bio, avatarUrl, isActive
refresh_tokens   → id, userId, token (UUID), expiresAt
articles         → id, authorId, slug, title, status, publishedAt, coverImageUrl
revisions        → id, articleId, content, editorNote (immutable, append-only)
tags             → id, name, slug
article_tags     → articleId × tagId (join)
comments         → id, articleId, authorId, body, status, parentId
claps            → id, articleId, userId (append-only)
article_events   → id, articleId, actorId, fromStatus, toStatus, note (audit log)
follows          → id, followerId, followingId (unique pair)
```

---

## 6. Rate Limiting

| Throttler | Limit | Window | Applied to |
|-----------|-------|--------|------------|
| default | 60 req | 1 min | All routes (global) |
| claps override | 50 req | 1 min | `POST /articles/:id/claps` only |
| comments override | 10 req | 1 hr | `POST /articles/:id/comments` only |

**Note:** Named throttler overrides replace the global limit for that route only.

---

## 7. Business Rules

| Rule | Detail |
|------|--------|
| Slug immutability | Auto-generated at creation; **never changes** even after edits |
| Content immutability | Revisions are append-only; no in-place edits |
| Clap model | Append-only events; counted at read time; no un-clap |
| Comment moderation | All comments start PENDING; only APPROVED comments are public |
| Follow uniqueness | `(followerId, followingId)` is a unique constraint; duplicate → 409 |
| Refresh token | Opaque UUID; stored in DB; deleted on logout |
| Soft delete | Users have `isActive` flag; deactivated users cannot log in |

---

## 8. Known Gaps (Frontend not built)

| Area | Gap |
|------|-----|
| exena-web | Reviews UI · search bar · coupon at checkout · notification bell |
| StoryForge frontend | Not started — entire Next.js 15 app (storefront + admin) pending |

---

## 9. Stack

| Layer | Technology |
|-------|-----------|
| API | NestJS 10 · TypeScript 5.7 |
| ORM | Prisma 6 · PostgreSQL 16 |
| Auth | JWT (access) + opaque UUID (refresh) |
| Queue | BullMQ 5 + Redis 7 (email notifications) |
| Frontend (planned) | Next.js 15 (App Router) · React 19 · Tailwind 4 · React Query 5 |

---

## 10. E2E Test Coverage

Run: `node scripts/e2e-test.mjs` from repo root.

- **67 user stories** covered end-to-end
- Seeds users via Prisma (bypasses login rate limit)
- Generates JWT tokens directly (no HTTP login calls)
- Respects 60 req/min global throttle with 1200ms inter-call delays
- Requires fresh server instance (in-memory throttle resets on restart)

**Result (2026-03-15):** 67/67 PASS ✅
