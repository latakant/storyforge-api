# StoryForge — User Stories
> All 67 stories verified E2E · 2026-03-15 · 67/67 PASS

---

## Actors

| Role   | Description |
|--------|-------------|
| READER | Discovers and reads articles; can follow writers, clap, comment |
| WRITER | Creates and publishes articles; manages own content |
| EDITOR | Reviews submissions; approves/rejects articles and comments |
| ADMIN  | Manages platform: users, tags, moderation queue, platform stats |

---

## Phase 0 — Health

| ID    | As a... | I want to...                        | So that...                        | Status |
|-------|---------|-------------------------------------|-----------------------------------|--------|
| US-00 | System  | GET /health returns `{status:"ok"}` | uptime monitors confirm API is up | ✅ PASS |

---

## Phase 1 — Authentication

| ID    | As a...  | I want to...                           | So that...                              | Status |
|-------|----------|----------------------------------------|-----------------------------------------|--------|
| US-01 | WRITER   | Have a valid JWT access token          | I can call authenticated endpoints      | ✅ PASS |
| US-02 | READER   | Have a valid JWT access token          | I can call authenticated endpoints      | ✅ PASS |
| US-03 | EDITOR   | Have a valid JWT access token          | I can moderate content                  | ✅ PASS |
| US-04 | ADMIN    | Have a valid JWT access token          | I can manage the platform               | ✅ PASS |
| US-05 | System   | Create a refresh token via DB seed     | Tests can call /auth/refresh reliably   | ✅ PASS |
| US-06 | WRITER   | Receive 401 for wrong password         | Security is enforced on login           | ✅ PASS |
| US-07 | WRITER   | GET /auth/me returns my role           | I know my current session context       | ✅ PASS |
| US-08 | WRITER   | POST /auth/refresh returns accessToken | I can renew sessions without re-logging | ✅ PASS |

---

## Phase 2 — Admin

| ID    | As a...  | I want to...                               | So that...                             | Status |
|-------|----------|--------------------------------------------|----------------------------------------|--------|
| US-08 | ADMIN    | GET /admin/stats returns platform metrics  | I have a dashboard overview            | ✅ PASS |
| US-09 | ADMIN    | GET /admin/users lists all users           | I can manage accounts                  | ✅ PASS |
| US-10 | ADMIN    | PATCH /admin/users/:id/role changes role   | I can promote/demote users             | ✅ PASS |
| US-11 | ADMIN    | PATCH /admin/users/:id/toggle deactivates | I can suspend/reinstate accounts       | ✅ PASS |
| US-12 | READER   | GET /admin/stats returns 403               | Admin endpoints are role-protected     | ✅ PASS |

---

## Phase 3 — Tags (Taxonomy)

| ID    | As a...  | I want to...                             | So that...                              | Status |
|-------|----------|------------------------------------------|-----------------------------------------|--------|
| US-13 | ADMIN    | POST /tags creates a tag                 | Articles can be categorised             | ✅ PASS |
| US-14 | ADMIN    | POST /tags creates a second tag          | Multiple taxonomies can coexist         | ✅ PASS |
| US-15 | WRITER   | POST /tags returns 403                   | Only admins can create tags             | ✅ PASS |
| US-16 | PUBLIC   | GET /tags lists all tags                 | Readers can browse topic areas          | ✅ PASS |
| US-17 | PUBLIC   | GET /tags/:slug returns the tag          | Readers can get a tag by its URL slug   | ✅ PASS |

**Notes:**
- Slug is auto-generated from `name` (lowercase, hyphens) — do NOT send `slug` in request body
- Tag name must be 1–50 characters

---

## Phase 4 — Articles (Content Core)

| ID    | As a...  | I want to...                                      | So that...                                       | Status |
|-------|----------|---------------------------------------------------|--------------------------------------------------|--------|
| US-18 | WRITER   | POST /articles creates an article                 | I have a draft to work on                        | ✅ PASS |
| US-19 | WRITER   | Article has an auto-generated URL slug            | The article is publicly addressable after publish | ✅ PASS |
| US-20 | WRITER   | New article starts in DRAFT status                | It's not publicly visible until submitted         | ✅ PASS |
| US-21 | WRITER   | PATCH /articles/:id updates title and tags        | I can refine metadata before submitting           | ✅ PASS |
| US-22 | WRITER   | PATCH /articles/:id/content adds a revision       | Content is versioned (append-only)                | ✅ PASS |
| US-23 | WRITER   | Adding a second revision keeps both               | Full history is preserved (immutable log)         | ✅ PASS |
| US-24 | WRITER   | GET /articles/:id/revisions returns revision list | I can review my edit history                      | ✅ PASS |
| US-25 | WRITER   | GET /articles/mine lists my articles              | I can manage my own content                       | ✅ PASS |
| US-26 | PUBLIC   | DRAFT articles are absent from GET /articles      | Readers only see published content                | ✅ PASS |
| US-27 | WRITER   | POST /articles/:id/submit → SUBMITTED             | I submit for editorial review                     | ✅ PASS |
| US-28 | WRITER   | Status is SUBMITTED after submit                  | I can confirm the transition occurred             | ✅ PASS |
| US-29 | WRITER   | Re-submitting SUBMITTED article returns 400/409   | Duplicate state transitions are blocked           | ✅ PASS |

**Notes:**
- `POST /articles` body: `{ title, content, coverImageUrl? }` — no `tagIds` at creation
- Tags are added via `PATCH /articles/:id` with `{ tagIds: [...] }`
- Content edits go to `PATCH /articles/:id/content` with `{ content, editorNote? }`
- Initial content is stored as revision #1 at creation time

---

## Phase 5 — Editorial Review

| ID    | As a...  | I want to...                                       | So that...                                    | Status |
|-------|----------|----------------------------------------------------|-----------------------------------------------|--------|
| US-30 | EDITOR   | POST /articles/:id/reject → DRAFT                  | Writers can revise rejected submissions        | ✅ PASS |
| US-31 | EDITOR   | Rejected article status returns to DRAFT           | The lifecycle is clearly communicated          | ✅ PASS |
| US-32 | EDITOR   | POST /articles/:id/publish → PUBLISHED             | Approved articles become publicly visible      | ✅ PASS |
| US-33 | EDITOR   | Status is PUBLISHED after publish                  | I can confirm the transition                   | ✅ PASS |
| US-34 | EDITOR   | `publishedAt` is set when article is published     | Timestamps are accurate for display            | ✅ PASS |
| US-35 | WRITER   | Slug is unchanged after PATCH on PUBLISHED article | URLs are immutable post-publish (SEO-safe)     | ✅ PASS |
| US-36 | WRITER   | POST /articles/:id/publish returns 403 for WRITER  | Only EDITOR/ADMIN can publish                  | ✅ PASS |

**Notes:**
- Reject body: `{ editorNote: "..." }` (min 10 chars, max 1000) — field is `editorNote` not `note`
- Lifecycle: DRAFT → SUBMITTED → PUBLISHED → ARCHIVED
- SUBMITTED → DRAFT requires `editorNote` (reject), or SUBMITTED → PUBLISHED (approve)
- Slug is generated at creation and **never changes** after PUBLISHED

---

## Phase 6 — Discovery

| ID    | As a...  | I want to...                               | So that...                                  | Status |
|-------|----------|--------------------------------------------|---------------------------------------------|--------|
| US-37 | PUBLIC   | GET /articles/:slug returns the article    | Readers can access published content by URL | ✅ PASS |
| US-38 | PUBLIC   | GET /discovery/articles returns a feed     | Readers have a homepage article feed        | ✅ PASS |
| US-39 | PUBLIC   | GET /discovery/articles?tag=:slug filters  | Readers can browse by topic                 | ✅ PASS |
| US-40 | PUBLIC   | GET /discovery/tags returns tag counts     | Readers know which topics are active        | ✅ PASS |
| US-41 | PUBLIC   | GET /discovery/trending returns articles   | Readers see what's popular right now        | ✅ PASS |

---

## Phase 7 — Claps (Engagement)

| ID    | As a...  | I want to...                               | So that...                                  | Status |
|-------|----------|--------------------------------------------|---------------------------------------------|--------|
| US-42 | READER   | POST /articles/:id/claps adds a clap       | I can show appreciation for good writing    | ✅ PASS |
| US-43 | WRITER   | POST /articles/:id/claps on own article    | Writers can clap their own work             | ✅ PASS |
| US-44 | READER   | Multiple claps are allowed                 | Clap total reflects enthusiasm              | ✅ PASS |
| US-45 | PUBLIC   | GET /articles/:id/claps returns `clapCount`| Readers see the total engagement score      | ✅ PASS |
| US-46 | PUBLIC   | Unauthenticated clap returns 401           | Claps require a logged-in account           | ✅ PASS |

**Notes:**
- Claps are append-only events — no "un-clap" — counted at read time
- Response shape: `{ articleId, clapCount }` (not `count`)
- Rate limit: 50 claps/min per IP (per-route, not global)

---

## Phase 8 — Comments (Moderated)

| ID    | As a...  | I want to...                                          | So that...                                      | Status |
|-------|----------|-------------------------------------------------------|-------------------------------------------------|--------|
| US-47 | READER   | POST /articles/:id/comments creates a comment         | I can engage in discussion                      | ✅ PASS |
| US-48 | READER   | New comment status is PENDING                         | Comments are held for review before going live  | ✅ PASS |
| US-49 | WRITER   | Reply to a comment via `parentId`                     | Threaded discussions are supported              | ✅ PASS |
| US-50 | PUBLIC   | PENDING comments are absent from public GET           | Unmoderated content is not shown to readers     | ✅ PASS |
| US-51 | EDITOR   | POST /comments/:id/approve → APPROVED                 | Good comments go live after review              | ✅ PASS |
| US-52 | EDITOR   | Re-approving an approved comment is idempotent        | Double-click does not cause errors              | ✅ PASS |
| US-53 | EDITOR   | POST /comments/:id/reject → REJECTED                  | Bad comments are hidden permanently             | ✅ PASS |
| US-54 | PUBLIC   | Approved comments appear in public GET                | Moderated comments reach readers                | ✅ PASS |
| US-55 | ADMIN    | DELETE /articles/:id/comments/:id removes comment     | Admins can clean up any comment                 | ✅ PASS |
| US-56 | ADMIN    | GET /admin/comments/pending returns queue             | Admins can see the moderation backlog           | ✅ PASS |

**Notes:**
- Commenting requires article to be PUBLISHED
- Rate limit: 10 comments/hr per IP (per-route, not global)
- Comment lifecycle: PENDING → APPROVED or REJECTED
- `parentId` enables nested replies (one level)

---

## Phase 9 — Social (Follow Graph)

| ID    | As a...  | I want to...                                    | So that...                                  | Status |
|-------|----------|-------------------------------------------------|---------------------------------------------|--------|
| US-57 | READER   | POST /users/:id/follow follows a writer         | I receive their new articles in my feed     | ✅ PASS |
| US-58 | READER   | Duplicate follow returns 409                    | The follow relationship is unique           | ✅ PASS |
| US-59 | READER   | GET /users/me/feed returns personalised feed    | I see articles from writers I follow        | ✅ PASS |
| US-60 | READER   | DELETE /users/:id/follow unfollows              | I can manage who I follow                   | ✅ PASS |

---

## Phase 10 — User Profile

| ID    | As a...  | I want to...                                     | So that...                                | Status |
|-------|----------|--------------------------------------------------|-------------------------------------------|--------|
| US-61 | WRITER   | PATCH /users/me updates name and bio             | My author profile reflects who I am       | ✅ PASS |

---

## Phase 11 — Archive

| ID    | As a...  | I want to...                                        | So that...                                   | Status |
|-------|----------|-----------------------------------------------------|----------------------------------------------|--------|
| US-62 | WRITER   | POST /articles/:id/archive → ARCHIVED               | I can retire articles I no longer endorse    | ✅ PASS |
| US-63 | WRITER   | Status is ARCHIVED after archive                    | The transition is confirmed                  | ✅ PASS |
| US-64 | PUBLIC   | ARCHIVED articles absent from GET /articles         | Retired content is hidden from readers       | ✅ PASS |

---

## Phase 12 — Logout

| ID    | As a...  | I want to...                                       | So that...                             | Status |
|-------|----------|----------------------------------------------------|----------------------------------------|--------|
| US-65 | WRITER   | POST /auth/logout invalidates my refresh token     | My session cannot be reused after exit | ✅ PASS |

**Notes:**
- Logout body: `{ refreshToken: string }` — must include the opaque refresh token
- After logout, the refresh token is deleted from DB (cannot refresh again)

---

## Summary

| Phase | Stories | All Pass |
|-------|---------|----------|
| Health | 1 | ✅ |
| Auth | 8 | ✅ |
| Admin | 5 | ✅ |
| Tags | 5 | ✅ |
| Articles | 12 | ✅ |
| Editor Review | 7 | ✅ |
| Discovery | 5 | ✅ |
| Claps | 5 | ✅ |
| Comments | 10 | ✅ |
| Social | 4 | ✅ |
| Profile | 1 | ✅ |
| Archive | 3 | ✅ |
| Logout | 1 | ✅ |
| **Total** | **67** | **67/67 ✅** |
