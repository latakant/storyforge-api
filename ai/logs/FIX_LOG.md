# StoryForge — Fix Log
> One entry per cert-bug run. Most recent first.

---

## 2026-04-02 · auth

**Bug:** auth/refresh-unauthorized — 2 tests failing in auth.service.spec.ts
**Root cause:** Tests expected JWT-based refresh validation (mocking jwt.verify). Implementation uses opaque UUID tokens stored in DB — jwt.verify is never called. Mocks had no effect; DB lookup succeeded, returning access token instead of throwing.
**Fix:** Replaced 2 JWT-assumption tests with DB-state-based tests:
  - "throws UnauthorizedException if user is inactive" (covers !stored.user.isActive guard)
  - "uses token value as DB lookup key and does not call jwt.verify" (structural contract)
**Verification:** tsc exit:0 · jest 15/15 pass
**Pattern:** PP-001 appended to pending-patterns.json
