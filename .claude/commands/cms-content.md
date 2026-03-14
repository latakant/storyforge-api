# cms-content — Blog, CMS & Content Platform Standards
> Load this before working on: posts, articles, pages, drafts, publishing, scheduling, revisions, slugs, SEO, categories, tags.
> Applies to: BACKEND_DEV, SENIOR_FULLSTACK, PRINCIPAL_ARCHITECT
> App type: Blog · CMS · Portfolio · News · Documentation Site · Knowledge Base

---

## The Content State Machine — Memorise This

```
DRAFT → REVIEW → SCHEDULED → PUBLISHED → ARCHIVED
  ↑        ↓          ↓           ↓
  └────────┴──── DRAFT (send back for edits)
```

| From | To | Who | Condition |
|------|----|-----|-----------|
| — | DRAFT | Author | Created |
| DRAFT | REVIEW | Author | Submitted for editorial review |
| DRAFT | SCHEDULED | Editor/Admin | Approved + publishAt set in future |
| DRAFT | PUBLISHED | Editor/Admin | Approved + publishAt = now or past |
| REVIEW | DRAFT | Editor | Sent back with feedback |
| REVIEW | SCHEDULED | Editor | Approved + future publishAt |
| REVIEW | PUBLISHED | Editor | Approved + publish now |
| SCHEDULED | PUBLISHED | System (cron) | publishAt reached |
| SCHEDULED | DRAFT | Author/Editor | Unscheduled |
| PUBLISHED | ARCHIVED | Admin | Retired content |
| ARCHIVED | PUBLISHED | Admin | Restored |

**PUBLISHED** is the only state visible to anonymous readers.
**DRAFT and REVIEW** are only visible to authenticated authors/editors.

---

## Core Rules

### 1. Slug is generated once from the title — never regenerated on title edit

```typescript
// WRONG — regenerating slug when title changes
post.title = 'New Title'
post.slug = slugify('New Title')  // breaks existing links, SEO disaster

// CORRECT — slug set once at creation, never changed
// If author explicitly requests slug change → create a 301 redirect record
async function createPost(dto: CreatePostDto, authorId: string): Promise<Post> {
  const slug = await generateUniqueSlug(dto.title)
  return prisma.post.create({
    data: { ...dto, slug, authorId, status: 'DRAFT' }
  })
}

async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title, { lower: true, strict: true })
  let slug = base
  let counter = 1
  while (await prisma.post.findUnique({ where: { slug } })) {
    slug = `${base}-${counter++}`
  }
  return slug
}

// If slug must change (rare) → create redirect
await prisma.slugRedirect.create({
  data: { fromSlug: oldSlug, toSlug: newSlug, postId }
})
```

### 2. Every save creates a revision — published content is never overwritten in-place

```typescript
// WRONG — directly mutating published content
await prisma.post.update({ where: { id }, data: { content: newContent } })

// CORRECT — save as new revision, publish when ready
// Revision history is append-only (Law 3)
async function saveRevision(postId: string, content: string, authorId: string): Promise<Revision> {
  const revisionNumber = await prisma.revision.count({ where: { postId } }) + 1
  return prisma.revision.create({
    data: { postId, content, authorId, revisionNumber }
  })
}

// Publishing: set Post.publishedRevisionId to the approved revision
async function publishPost(postId: string, revisionId: string): Promise<void> {
  await prisma.$transaction([
    prisma.post.update({
      where: { id: postId },
      data: {
        status: 'PUBLISHED',
        publishedRevisionId: revisionId,
        publishedAt: new Date()
      }
    }),
    prisma.revision.update({
      where: { id: revisionId },
      data: { publishedAt: new Date() }
    })
  ])
}
```

### 3. Scheduled publishing via cron — publishAt is the source of truth

```typescript
// Cron runs every minute — checks for posts due to publish
@Cron('* * * * *')
async publishScheduledPosts(): Promise<void> {
  const due = await prisma.post.findMany({
    where: {
      status: 'SCHEDULED',
      publishAt: { lte: new Date() }
    }
  })

  for (const post of due) {
    await prisma.post.update({
      where: { id: post.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() }
    })
    // Queue notification — Law 5
    await contentQueue.add('post-published', { postId: post.id })
    monitoringLogger.cron({ event: 'POST_PUBLISHED', postId: post.id })
  }
}
```

### 4. SEO metadata is explicit — never inferred at render time

```typescript
// SEO fields stored per post — not computed from content at request time
model Post {
  // ...
  metaTitle       String?   // defaults to title if null
  metaDescription String?   // defaults to excerpt if null
  canonicalUrl    String?   // for syndicated content — points to original
  ogImage         String?   // Open Graph image URL
  noIndex         Boolean   @default(false)  // for private/thin content
}

// API: always return these explicitly — let frontend render <head> tags
// Never auto-generate from content body — that's the editor's responsibility
```

### 5. Category/tag taxonomy — categories are a tree, tags are a flat set

```typescript
// Categories: hierarchical (Technology > Web Dev > React)
// Tags: flat labels (performance, accessibility, typescript)

// WRONG — allowing circular category parents
await prisma.category.update({ where: { id: childId }, data: { parentId: grandchildId } })
// This creates: child → grandchild → child → ... infinite loop

// CORRECT — validate no cycles before saving
async function setCategoryParent(categoryId: string, parentId: string): Promise<void> {
  if (await wouldCreateCycle(categoryId, parentId)) {
    throw new ConflictException('This would create a circular category hierarchy')
  }
  await prisma.category.update({ where: { id: categoryId }, data: { parentId } })
}

async function wouldCreateCycle(categoryId: string, parentId: string): Promise<boolean> {
  let current = parentId
  while (current) {
    if (current === categoryId) return true  // cycle detected
    const parent = await prisma.category.findUnique({
      where: { id: current }, select: { parentId: true }
    })
    current = parent?.parentId ?? null
  }
  return false
}
```

### 6. Content visibility is enforced server-side — not just in the query

```typescript
// Public API: only PUBLISHED posts, non-noIndex
async function getPublicPost(slug: string): Promise<Post> {
  const post = await prisma.post.findUnique({
    where: { slug },
    include: { publishedRevision: true, author: true, categories: true, tags: true }
  })
  if (!post || post.status !== 'PUBLISHED') throw new NotFoundException('Post not found')
  return post
}

// Author API: can see their own DRAFT/REVIEW posts
async function getMyPost(slug: string, userId: string): Promise<Post> {
  const post = await prisma.post.findUnique({ where: { slug } })
  if (!post) throw new NotFoundException()
  if (post.authorId !== userId && !isEditor(userId)) throw new ForbiddenException()
  return post
}
```

### 7. Comments — moderation before visibility

```typescript
// Comments not visible until approved (for moderated blogs)
// OR: visible immediately but flagged/removed after report (for open blogs)
// Set per blog config — not hardcoded

// Moderated flow:
comment.status = 'PENDING'  // → author sees "awaiting moderation"
// editor reviews → APPROVED (visible) | REJECTED (hidden)

// Open flow:
comment.status = 'APPROVED'  // immediately visible
// report → FLAGGED → editor reviews → APPROVED (restored) | REMOVED
```

---

## Data Model

```prisma
model Post {
  id                  String     @id @default(cuid())
  authorId            String
  slug                String     @unique  // immutable after creation
  title               String
  excerpt             String?
  status              PostStatus @default(DRAFT)
  publishedRevisionId String?    // FK → Revision — the live version
  publishAt           DateTime?  // for scheduled posts
  publishedAt         DateTime?  // when actually published
  // SEO
  metaTitle           String?
  metaDescription     String?
  canonicalUrl        String?
  ogImage             String?
  noIndex             Boolean    @default(false)
  // Metrics
  viewCount           Int        @default(0)
  createdAt           DateTime   @default(now())
  updatedAt           DateTime   @updatedAt

  author              User       @relation(fields: [authorId], references: [id])
  revisions           Revision[]
  publishedRevision   Revision?  @relation("PublishedRevision", fields: [publishedRevisionId], references: [id])
  categories          PostCategory[]
  tags                PostTag[]
  comments            Comment[]
  slugRedirects       SlugRedirect[]

  @@index([status])
  @@index([authorId])
  @@index([publishAt])  // for scheduled publish cron
}

model Revision {
  id             String   @id @default(cuid())
  postId         String
  content        String   @db.Text
  authorId       String   // who made this revision
  revisionNumber Int
  publishedAt    DateTime?
  createdAt      DateTime @default(now())
  // append-only — never modified (Law 3)

  post           Post     @relation(fields: [postId], references: [id])
  publishedPost  Post?    @relation("PublishedRevision")

  @@unique([postId, revisionNumber])
  @@index([postId])
}

model Category {
  id        String     @id @default(cuid())
  name      String
  slug      String     @unique
  parentId  String?    // self-reference for tree (no cycles allowed)
  parent    Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryTree")
  posts     PostCategory[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

model Tag {
  id    String    @id @default(cuid())
  name  String    @unique
  slug  String    @unique
  posts PostTag[]
}

model PostCategory {
  postId     String
  categoryId String
  post       Post     @relation(fields: [postId], references: [id])
  category   Category @relation(fields: [categoryId], references: [id])

  @@id([postId, categoryId])
}

model PostTag {
  postId String
  tagId  String
  post   Post   @relation(fields: [postId], references: [id])
  tag    Tag    @relation(fields: [tagId], references: [id])

  @@id([postId, tagId])
}

model SlugRedirect {
  id       String   @id @default(cuid())
  fromSlug String   @unique
  toSlug   String
  postId   String
  post     Post     @relation(fields: [postId], references: [id])
  createdAt DateTime @default(now())
  // permanent 301 redirects — never delete

  @@index([fromSlug])
}

model Comment {
  id        String        @id @default(cuid())
  postId    String
  authorId  String?       // null for anonymous
  guestName String?       // for anonymous comments
  guestEmail String?
  content   String
  status    CommentStatus @default(PENDING)
  parentId  String?       // for nested replies
  parent    Comment?      @relation("CommentReplies", fields: [parentId], references: [id])
  replies   Comment[]     @relation("CommentReplies")
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  @@index([postId, status])
}

enum PostStatus    { DRAFT REVIEW SCHEDULED PUBLISHED ARCHIVED }
enum CommentStatus { PENDING APPROVED REJECTED FLAGGED REMOVED }
```

---

## Common Mistakes

| Mistake | Impact | Correct pattern |
|---------|--------|----------------|
| Regenerate slug on title edit | Breaks URLs, SEO penalty | Slug set once — redirect record for changes |
| Overwrite published content in-place | No revision history | Revision-based editing — publish specific revision |
| Schedule publishing in application code | Misses on server restart | publishAt field + cron checks every minute |
| Infer SEO fields from body at render time | Slow, inconsistent | Explicit metaTitle, metaDescription per post |
| Allow circular category parents | Infinite loop in queries | Cycle detection before setting parentId |
| Show DRAFT posts to public | Content leak | Status check server-side, always |
| Delete old revisions to save space | Lose audit trail | Never delete revisions — they're append-only |
| Tags and categories in same model | Confusing query logic | Categories = tree (hierarchical), Tags = flat set |
| Comments visible without moderation | Spam, abuse | Gate visibility on CommentStatus = APPROVED |
