Make a Prisma schema change — new model, field, relation, index, or constraint.

$ARGUMENTS

This is always ARCH path. Human approval required at two checkpoints before any migration runs.

---

**STEP 1 — Classify the change and risk**

| Change type | Risk | Notes |
|-------------|------|-------|
| New model (no FK to existing) | Low-Medium | Safe — no data impact |
| New nullable field | Low | Safe — existing rows get NULL |
| New required field with default | Low | Safe — default fills existing rows |
| New required field WITHOUT default | HIGH | Must be done in 2 steps |
| New unique constraint | Medium | Check existing data won't violate |
| New relation (FK) | Medium | Check referential integrity |
| Rename field/model | HIGH | Breaking — TypeScript + data migration |
| Remove field/model | HIGH | Destructive — data loss |

Present classification and risk. **STOP. Wait for "approved" to continue.**

---

**STEP 2 — Read current schema**
- Read `prisma/schema.prisma` in full
- Find the relevant model(s)
- Note existing: `@@unique`, `@@index`, `@@map`, relations

---

**STEP 3 — Design the change**

Output the exact diff in Prisma schema format:

```diff
+ model NewModel {
+   id          String   @id @default(cuid())
+   name        String
+   isActive    Boolean  @default(true)
+   createdAt   DateTime @default(now())
+   updatedAt   DateTime @updatedAt
+
+   @@map("new_models")
+ }
```

Schema rules (all mandatory):
- PKs: `String @id @default(cuid())` — NEVER `Int @id @default(autoincrement())`
- ALL models: `createdAt DateTime @default(now())` + `updatedAt DateTime @updatedAt`
- Soft delete: `isActive Boolean @default(true)` — never `deletedAt`
- Table names: `snake_case` via `@@map("table_name")`
- Prices: `Decimal(10, 2)` — never Float
- `@@index` on every FK field and high-traffic query field
- `@@unique` on business-unique fields (email, phone, slug, sku, orderNumber)

**STOP. Wait for "approved" on the schema design before editing any file.**

---

## EXPAND-CONTRACT PATTERN (MANDATORY for production changes)

For ANY rename, type change, or structural refactor on a column that has live data:

**NEVER do this in one migration.** Use three separate deploys:

### Phase 1 — Expand
Add the new field as nullable alongside the old one. Deploy. Both exist.
Write to BOTH columns in application code.
```prisma
model User {
  phone     String   // OLD — keep writing to this
  phoneNew  String?  // NEW — start writing here too
}
```

### Phase 2 — Backfill
Migrate existing data in batches. Never full-table in one query:
```sql
UPDATE users SET phone_new = phone WHERE phone_new IS NULL AND id > $cursor LIMIT 1000;
```
Repeat until all rows backfilled. Update readers to use new column.

### Phase 3 — Contract
After ALL code is updated to read from new column, drop the old one.
Make new column required. Separate deploy.
```prisma
model User {
  phoneNew  String  @map("phone")  // renamed, required, old column dropped
}
```

**Laws:**
- One migration file = one phase. NEVER combine expand + contract in same file.
- Minimum 24h between phases in production to allow rollback window.
- HIGH risk classification → always use expand-contract.

---

**STEP 4 — Apply the schema change**
Edit `prisma/schema.prisma` with the approved design.

---

**STEP 5 — Generate Prisma client**
Run: `npx prisma generate`
This regenerates the TypeScript client. No DB change yet.

---

**STEP 6 — TypeScript check (pre-migration)**
Run: `npx tsc --noEmit`
Fix any type errors from the new schema before running migration.

---

**STEP 7 — Migration checkpoint**

Present to the user:
```
Ready to run migration:
  npx prisma migrate dev --name <descriptive-name>

This will:
  - Create migration file in prisma/migrations/
  - Apply SQL to the database
  - [list the SQL operations: CREATE TABLE, ADD COLUMN, etc.]

Confirm: "run it" or "approved"
```

**STOP. Do not run migration without explicit confirmation.**

After approval: `npx prisma migrate dev --name <name>`

---

**STEP 8 — Update dependent services**
- New model → create CRUD methods in the relevant service
- New field → add to existing `include`/`select`/`create`/`update` Prisma calls
- New relation → update related service's `include` clauses
- Run: `npx tsc --noEmit` again after service updates

---

**STEP 9 — Write or update tests**
If new model/method: add test cases to the service spec.
Run: `npx jest --testPathPattern=<module> --passWithNoTests`

---

**STEP 10 — Update CORTEX documentation**
- Update `ai/mermaid/09-db-constraints.md` with new constraints/indexes
- Update `ai/mermaid/00-PROJECT-MASTER.md` DB section
- Append to `ai/app.prd.md` changelog

Use `/cortex-commit` with message: `feat(<module>): add <model/field> to Prisma schema`
Then log: `node scripts/lifecycle.js log --action=MIGRATION_RUN --module=<module> --detail="<migration name>: <what changed>"`

---

**LAYER LOG — append to `ai/lifecycle/LAYER_LOG.md`:**

```
[<ISO timestamp>]
TYPE: BUILD
PROJECT: exena-api
ROLE: BACKEND_DEV
LAYER_ORIGIN: L5_PRISMA
LAYER_FIXED: L5_PRISMA
LAYERS_TOUCHED: L5_PRISMA, L4_SERVICE, L8_TEST
LAYER_VIOLATED: NONE
FRONTEND_IMPACT: <NONE|LOW|MEDIUM|HIGH — new model likely LOW, changed field MEDIUM>
PA_REQUIRED: YES Phase 2
CONTRACT: <UNCHANGED if new model | NON_BREAKING if new nullable field | BREAKING if field removed/renamed>
MODULE: <module>
FILES: prisma/schema.prisma, <migration file>, <service file>
DETAIL: migration: <migration name> — <what changed in schema>
```

---

Output: risk classification | schema diff | migration name | services updated | tsc passing | docs updated
