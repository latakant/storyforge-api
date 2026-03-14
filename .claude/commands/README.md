# Next.js Adapter (6 skills)

For Next.js App Router frontend projects using React Query.

---

## Skills

| Skill | Command | When to use |
|-------|---------|-------------|
| `dev-frontend-context` | `/dev-frontend-context [web\|admin]` | Start of any frontend session — loads app context |
| `dev-frontend-page` | `/dev-frontend-page` | Adding a new page/route |
| `dev-frontend-component` | `/dev-frontend-component` | Building a reusable UI component |
| `dev-frontend-service` | `/dev-frontend-service` | Adding an API service function |
| `dev-frontend-debug` | `/dev-frontend-debug` | Debugging frontend issues |
| `dev-frontend-lint` | `/dev-frontend-lint [path]` | Standards audit — scored output |

## Typical session flow

```
/dev-frontend-context web      → load storefront context
/dev-frontend-page             → add a new page
/dev-frontend-service          → add the API service call
/cortex-commit                 → commit with lifecycle log
```

## Required files

Before these skills work reliably, create:
- `ai/memory/frontend-standards.md` (from `templates/frontend-standards.md.template`)

If this file doesn't exist, the skill falls back to CLAUDE.md standards and notes the missing file.

## Multi-frontend projects

If your project has multiple frontends (e.g., storefront + admin panel):
- Run `/dev-frontend-context web` for storefront work
- Run `/dev-frontend-context admin` for admin panel work
- Context Brief shows which app is loaded
