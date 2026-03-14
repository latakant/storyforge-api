# StoryForge API

NestJS backend for StoryForge — a publishing platform for writers, editors, and readers.

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 · TypeScript 5.7 |
| Framework | NestJS 10 |
| Database | PostgreSQL 16 + Prisma 6 |
| Auth | JWT (access) + opaque refresh tokens |
| Queue | BullMQ + Redis 7 |
| Email | Resend |
| Docs | Swagger (`/api/docs`) |
| Tests | Jest — 52 unit tests |

## Modules

| Module | Endpoints | Description |
|--------|-----------|-------------|
| `auth` | 4 | Register · login · refresh · logout |
| `users` | 5 | Profile CRUD · avatar · follow/unfollow |
| `articles` | 8 | CRUD · state machine · slug lock · revisions |
| `tags` | 4 | Create · list · tag article |
| `comments` | 5 | Submit (PENDING) · moderation · delete |
| `claps` | 2 | Append-only clap event · count |
| `discovery` | 2 | Public feed · tag listing |
| `mailer` | — | BullMQ — publish + comment-approved notifications |
| `admin` | 5 | Stats · user management · pending comments |
| `health` | 1 | `GET /api/health` |

## Article State Machine

```
DRAFT → SUBMITTED → PUBLISHED → ARCHIVED
          ↓
        DRAFT  (rejected by editor)
```

- Writers submit drafts for review
- Editors publish or reject with a note
- Slug is permanently locked at publish time
- Content is append-only (Revision records — never overwrites)

## Roles

| Role | Can |
|------|-----|
| `READER` | Read published articles, comment, clap |
| `WRITER` | All of READER + create/edit own articles |
| `EDITOR` | All of WRITER + publish/reject/moderate comments |
| `ADMIN` | Full access + user management |

## Getting Started

### 1. Prerequisites

- Node.js 22+
- PostgreSQL 16
- Redis 7

### 2. Install

```bash
npm install
```

### 3. Environment

Create `.env` in the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/storyforge

# JWT
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m

# Redis (BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
MAIL_FROM=noreply@yourdomain.com

# CORS — comma-separated list of allowed origins
CORS_ORIGINS=http://localhost:3000

# App
PORT=4000
NODE_ENV=development
```

### 4. Database

```bash
# Run migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate
```

### 5. Run

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

API runs at `http://localhost:4000`
Swagger docs at `http://localhost:4000/api/docs`

## Testing

```bash
# Run all unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov
```

52 unit tests across: `AuthService` · `ArticlesService` · `CommentsService` · `ClapsService`

## DAG Visualizer

```bash
# Show task dependency graph
npm run dag:visualize

# Show tasks ready to run
npm run dag:next
```

## API Overview

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
```

### Articles
```
GET    /api/articles              public feed (published only)
POST   /api/articles              create draft (WRITER+)
GET    /api/articles/:slug        single article
PATCH  /api/articles/:id          update draft
POST   /api/articles/:id/content  save content revision
POST   /api/articles/:id/submit   submit for review
POST   /api/articles/:id/publish  publish (EDITOR+)
POST   /api/articles/:id/reject   reject with note (EDITOR+)
POST   /api/articles/:id/archive  archive (owner or ADMIN)
GET    /api/articles/:id/revisions revision history
```

### Comments
```
GET    /api/articles/:id/comments          list approved comments
POST   /api/articles/:id/comments          submit comment (PENDING)
POST   /api/articles/:articleId/comments/:id/approve  (EDITOR+)
POST   /api/articles/:articleId/comments/:id/reject   (EDITOR+)
DELETE /api/articles/:articleId/comments/:id          (author or ADMIN)
```

### Claps
```
POST   /api/articles/:id/claps    clap (append-only)
GET    /api/articles/:id/claps    get clap count
```

### Tags
```
GET    /api/tags
POST   /api/tags
GET    /api/tags/:slug/articles
```

### Admin
```
GET    /api/admin/stats
GET    /api/admin/users
PATCH  /api/admin/users/:id/role
PATCH  /api/admin/users/:id/toggle
GET    /api/admin/comments/pending
```

## Project Structure

```
src/
├── admin/          stats · user management · pending comments
├── articles/       CRUD · state machine · revisions
├── auth/           JWT · refresh tokens · guards
├── claps/          append-only events
├── comments/       submit · moderation
├── common/         filters · middleware · config validation
├── discovery/      public feed · tag listing
├── health/         health check
├── mailer/         BullMQ email queue
├── prisma/         Prisma service
├── tags/           tag CRUD
├── users/          profile · follow/unfollow
└── app.module.ts
```

## Frontend

The frontend (Next.js 15) lives in a separate repo:
**[storyforge-web](https://github.com/latakant/storyforge-web)**
