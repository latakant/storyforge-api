# CORTEX Universal Domain Model
# Version: 1.0 | Added: v9.1
# Read by: cert-stocktake (app type detection) · cert-review (Step 2.9 domain boundaries)
#          cert-plan (domain assembly) · cert-predict (domain risk scoring)
#
# 15 base domains that appear across modern software products.
# Any app type is an assembly of these domains.
# Each domain has: responsibilities · forbidden actions · invariants · state machines

---

## Domain Catalogue

### IDENTITY
**Responsibilities:** authentication, authorization, tokens, sessions, roles, permissions
**Owns:** User credentials, JWT tokens, refresh tokens, roles, OTP records
**Forbidden:** user profile data (→ Users), business logic of other domains
**Key invariants:**
- Passwords never stored in plaintext — always hashed (bcrypt/argon2)
- JWT secret from env, never hardcoded
- OTP expires — never permanent
- Role checks happen at guard layer, never inside business services
**State machine:** OTP → SENT → VERIFIED | EXPIRED

---

### USERS
**Responsibilities:** user profiles, preferences, addresses, account management
**Owns:** User profiles, delivery addresses, preferences
**Forbidden:** authentication (→ Identity), orders (→ Orders), payments (→ Payments)
**Key invariants:**
- Soft delete only — never hard delete user records
- Address list owned by user — cannot be modified by other domains directly
- Profile updates do not affect order history

---

### ORGANIZATIONS
**Responsibilities:** multi-tenancy, teams, workspaces, member management
**Owns:** Organizations, team memberships, workspace settings
**Forbidden:** billing (→ Billing/Payments), product catalog (→ Catalog)
**Key invariants:**
- Organization owns its data — cross-org data access forbidden
- Member permissions scoped to organization

---

### CATALOG
**Responsibilities:** products, categories, variants, media, product descriptions
**Owns:** Products, Categories, Variants, ProductImages
**Forbidden:** inventory/stock data (→ Inventory), pricing (→ Pricing), orders (→ Orders)
**Key invariants:**
- Product data is read-only for other domains — no cross-domain writes
- Categories form a tree — parent-child hierarchy, no cycles
- Media belongs to product — deleting product cascades to media
- Variants belong to product — price is base, adjustments in Pricing domain

---

### PRICING
**Responsibilities:** price rules, discounts, coupons, promotional pricing
**Owns:** Prices, Coupons, DiscountRules, PriceHistory
**Forbidden:** inventory (→ Inventory), order totals after creation (→ Orders/Invoices are immutable)
**Key invariants:**
- Price at time of order is snapshot — stored in order, not recalculated later (Law 3)
- Coupon validation: minOrder + expiry + usageLimit + perUser — all 4 guards required
- PERCENTAGE coupons capped at maximum discount value
- Coupon usage tracked with @@unique(couponId, userId, orderId)

---

### INVENTORY
**Responsibilities:** stock levels, reservations, warehouse stock, stock history
**Owns:** Stock records, StockReservations, StockMovements
**Forbidden:** product data (→ Catalog), order logic (→ Orders), pricing (→ Pricing)
**Key invariants:**
- Stock NEVER goes negative — DB CHECK constraint required
- Stock decrements at order creation, NEVER at cart add (no reservation mechanism unless explicitly built)
- Stock restores on order cancellation — in same $transaction as status change
- Stock changes are events — every movement logged with reason
**State machine:** Stock → AVAILABLE → RESERVED → DECREMENTED → RESTORED

---

### CART
**Responsibilities:** shopping cart, cart items, cart lifecycle
**Owns:** Cart, CartItems
**Forbidden:** stock modification (→ Inventory), order creation (→ Orders), price calculation (→ Pricing)
**Key invariants:**
- Cart does NOT decrement stock — adding to cart is not a reservation
- Cart items reference product price at time of add — but checkout recalculates
- Guest cart merged into user cart on login
- Stale carts cleaned up periodically (job)
- Cart cleared after successful order creation

---

### ORDERS / TRANSACTIONS
**Responsibilities:** order lifecycle, order items, order history, fulfilment tracking
**Owns:** Orders, OrderItems, OrderStatusHistory
**Forbidden:** catalog modification, direct payment processing (→ Payments), stock management without service call (→ Inventory)
**Key invariants:**
- Order creation is atomic: order + stock decrement + payment record in single $transaction
- Order amounts are snapshots — never recalculated from current prices (Law 3)
- State transitions are guarded — invalid transitions throw ConflictException (Law 4)
- Customer cancel: PENDING only. Admin cancel: PENDING/CONFIRMED/PROCESSING only.
- Terminal states: CANCELLED, REFUNDED, DELIVERED — no further transitions
**State machine:**
```
PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
   ↓           ↓            ↓           ↓
CANCELLED  CANCELLED   CANCELLED  CANCELLED (rare)
                                         ↓ (from DELIVERED)
                                      REFUNDED
```

---

### PAYMENTS
**Responsibilities:** payment processing, webhook handling, payment records, refunds
**Owns:** Payments, ProcessedWebhookEvents, Refunds
**Forbidden:** order status (call Orders service), invoice generation (→ Invoices)
**Key invariants:**
- Webhook signature verified with timingSafeEqual BEFORE any DB write
- ProcessedWebhookEvent deduplication check BEFORE any state change (idempotency — Law 7)
- Payment + order status update in single $transaction (Law 7)
- Amounts in paise for Razorpay API calls, INR Decimal in DB
- Payment records never modified after creation — corrections create Refund records (Law 3)
**State machine:**
```
PENDING → PAID → REFUNDED
PENDING → FAILED
```

---

### FULFILLMENT / DELIVERY
**Responsibilities:** shipment creation, tracking, delivery updates, courier integration
**Owns:** Shipments, TrackingHistory, DeliveryAddresses (copy)
**Forbidden:** order status (call Orders service), payment processing (→ Payments)
**Key invariants:**
- Shipment created only after order is CONFIRMED
- Webhook signature verified before processing delivery status updates
- Tracking history is append-only — never modified (Law 3)
- Delivery address snapshot stored at shipment time — not linked live to user address

---

### COMMUNICATION
**Responsibilities:** email, SMS, push notifications, notification preferences
**Owns:** NotificationTemplates, NotificationLogs, UserPreferences
**Forbidden:** direct DB writes to other domains — only consumes events (Law 5)
**Key invariants:**
- Communication is always async — never called synchronously from business logic (Law 5)
- Notification failures must NOT fail business transactions (Law 5)
- Notification logs retained for audit trail
- User preference respected — opted-out users not messaged

---

### REVIEWS / FEEDBACK
**Responsibilities:** product reviews, ratings, moderation, feedback aggregation
**Owns:** Reviews, Ratings, ReviewMedia
**Forbidden:** modifying products (→ Catalog), order data (→ Orders)
**Key invariants:**
- Review only allowed on DELIVERED orders (verified ownership)
- One review per user per product per order
- Reviews are soft-deleted, not hard-deleted
- Rating aggregation is eventually consistent (computed async)

---

### SEARCH / DISCOVERY
**Responsibilities:** full-text search, autocomplete, faceted filtering, search analytics
**Owns:** SearchIndex (separate from main DB), SearchAnalytics
**Forbidden:** modifying catalog data (→ Catalog), order data (→ Orders)
**Key invariants:**
- Search index is eventually consistent — always reads from index, never from DB directly
- Index rebuilt/updated via events (ProductCreated, ProductUpdated) — Law 6
- Search failures must not fail product browsing (fallback to DB query acceptable)

---

### ANALYTICS
**Responsibilities:** business metrics, dashboards, reporting, event tracking
**Owns:** AnalyticsEvents, MetricSnapshots, Reports
**Forbidden:** modifying any other domain's data
**Key invariants:**
- Analytics is write-only from other domains — consumes events, never pushes data back
- Analytics failures must not affect core transactions (Law 5)
- PII must be anonymized in analytics records

---

### ADMIN / OPERATIONS
**Responsibilities:** admin dashboard, platform management, configuration, audit logs
**Owns:** AdminActions, AuditLogs, SystemSettings
**Forbidden:** bypassing domain rules even for admins — must go through same domain services
**Key invariants:**
- Admin actions are logged — every admin mutation writes to AuditLog
- Admin cannot bypass domain invariants (e.g. cannot set stock negative via admin)
- Settings changes are versioned — no silent overwrites

---

## App Type Assemblies

### E-Commerce
**Required domains:** Identity · Users · Catalog · Pricing · Inventory · Cart · Orders · Payments · Fulfillment · Communication · Reviews · Search · Admin
**Optional:** Analytics · Organizations (for multi-seller/marketplace)
**Critical cross-domain flows:**
- Cart → Orders → Inventory → Payments → Fulfillment (all in sequence, Laws 2+7)
- Payments webhook → Orders confirmation → Fulfillment trigger (Law 6)

### SaaS / Subscription
**Required domains:** Identity · Users · Organizations · Pricing · Payments · Communication · Admin
**Optional:** Analytics · Search
**Critical cross-domain flows:**
- Subscription change → Payments → Access update (Law 6)
- Trial expiry → Communication → Billing → Access revoke

### Ride-Hailing
**Required domains:** Identity · Users · [Drivers] · [Vehicles] · [Availability] · Orders/Trips · Payments · Communication · [Ratings] · Admin
**Critical cross-domain flows:**
- Booking → Availability check → Trip creation → Payment → Rating unlock

### Marketplace / Multi-Vendor
**Same as E-Commerce + Organizations domain for seller management**
**Additional invariants:** seller-scoped inventory, seller payout via Payments domain

---

### Booking (Hotels · Restaurants · Appointments · Events · Rentals)
**Required domains:** Identity · Users · [Resources] · [Availability] · Orders/Bookings · Payments · Communication · Reviews · Admin
**Optional:** Analytics · Search · Organizations (for multi-location businesses)
**Custom domains needed:**
- **RESOURCES** — bookable entities (rooms, tables, seats, time slots, vehicles, equipment)
- **AVAILABILITY** — calendars, capacity, blackout dates, real-time slot management
**Critical cross-domain flows:**
- Availability check → hold slot → Payment → confirm booking → release hold on timeout (Law 7)
- Booking cancellation → restore availability → refund trigger → notify guest
**Key invariants:**
- Availability check + slot hold + booking creation = single $transaction (double-booking prevention)
- Slot hold expires if payment not completed (cron job releases held slots — Law 7)
- Price at time of booking is snapshot — not recalculated on check-in (Law 3)
- Cancellation policy enforced by Payments domain (partial/full refund rules)
**State machine:** Booking → PENDING_PAYMENT → CONFIRMED → CHECKED_IN → COMPLETED | CANCELLED | NO_SHOW

---

### FinTech / Wallet / Lending
**Required domains:** Identity · Users · [Accounts] · [Ledger] · Payments · Communication · Admin
**Optional:** Analytics · Organizations (for business accounts)
**Custom domains needed:**
- **ACCOUNTS** — bank accounts, wallets, balances, account types (checking, savings, credit)
- **LEDGER** — double-entry bookkeeping, transaction records, reconciliation (NEVER single-entry)
- **COMPLIANCE** — KYC/AML checks, regulatory reporting, audit trail
**Critical cross-domain flows:**
- Transfer: debit source → credit destination — single $transaction, both or neither (Law 7)
- Ledger entries append-only — corrections via reversal entries, never edits (Law 3)
**Key invariants:**
- Double-entry ledger: every debit has a matching credit — balances always sum to zero
- No money created or destroyed — transfer moves between accounts only
- All financial records immutable — never UPDATE, only INSERT reversals (Law 3)
- KYC required before any money movement above threshold
- All money in smallest denomination (paise/cents) — no floating point (Law 1)
**State machine:** Transaction → INITIATED → PROCESSING → COMPLETED | FAILED | REVERSED

---

### EdTech / Learning Platform
**Required domains:** Identity · Users · Organizations · [Courses] · [Enrollment] · Payments · Communication · Reviews · Admin
**Optional:** Analytics · Search · [Certificates]
**Custom domains needed:**
- **COURSES** — course catalog, lessons, modules, media (video, PDF, quiz), progress tracking
- **ENROLLMENT** — student-course relationships, access control, cohorts, completion tracking
- **CERTIFICATES** — completion verification, certificate generation, credential issuance
**Critical cross-domain flows:**
- Purchase → Enrollment → Course access granted → Progress tracking → Certificate on completion
- Refund → Enrollment revoked → Access removed (in $transaction)
**Key invariants:**
- Course content access gated by active enrollment — check every request
- Progress is append-only — lesson completions never deleted (Law 3)
- Certificate issued only when completion >= 100% — checked server-side, never client-trusted
- Enrollment status state-machined — ACTIVE | PAUSED | COMPLETED | REFUNDED
**State machine:** Enrollment → PENDING_PAYMENT → ACTIVE → COMPLETED | PAUSED | REFUNDED

---

### Social / Community Platform
**Required domains:** Identity · Users · [Content] · [Social Graph] · [Feed] · Communication · [Moderation] · Admin
**Optional:** Analytics · Search · [Monetization]
**Custom domains needed:**
- **CONTENT** — posts, comments, media, reactions, content types (text/image/video)
- **SOCIAL GRAPH** — follows, friends, blocks, mutes, relationship state
- **FEED** — algorithmic/chronological feed generation, fan-out on write vs read
- **MODERATION** — content reports, auto-moderation, human review queue, action log
**Critical cross-domain flows:**
- Post created → fan-out to followers' feeds → notification dispatch (all async — Law 5)
- Report → Moderation queue → action (hide/remove/warn/ban) → notification
**Key invariants:**
- Feed fan-out is async — never block post creation waiting for fan-out (Law 5)
- Deleted content is soft-deleted — never hard-deleted (audit + appeals — Law 3)
- Block relationship is bidirectional — A blocks B means neither can see the other
- Moderation actions logged with actor + reason — immutable audit trail (Law 3)
- Rate limiting on all content creation endpoints — prevent spam
**No money flow** unless Monetization domain added (ads, subscriptions, tips)

---

### Blog / CMS / Content Platform
**Required domains:** Identity · Users · [Content] · [Taxonomy] · Communication · Admin
**Optional:** Analytics · Search · Organizations (for multi-author publications) · [Comments]
**Custom domains needed:**
- **CONTENT** — posts, pages, articles, revisions, slugs, SEO metadata, scheduling
- **TAXONOMY** — categories (tree hierarchy), tags (flat), series, collections
**Critical cross-domain flows:**
- Draft → Review → Scheduled → Published (cron triggers at publishAt) → Notification dispatched
- Content edit → Revision created (append-only) → Published revision pointer updated
**Key invariants:**
- Slug set once at creation — never regenerated on title change (create SlugRedirect instead)
- Revisions are append-only — never delete or edit revision history (Law 3)
- Only PUBLISHED content visible to anonymous readers — checked server-side
- Scheduled publishing via publishAt field + cron — never application-side timers
- Category hierarchy has no cycles — validate before setting parentId
- SEO metadata (metaTitle, metaDescription, canonicalUrl) explicit per post — not computed
**State machine:** Post → DRAFT → REVIEW → SCHEDULED → PUBLISHED → ARCHIVED

---

### Healthcare / Clinic Management
**Required domains:** Identity · Users · [Patients] · [Providers] · [Appointments] · [Records] · Payments · Communication · Admin
**Custom domains needed:**
- **PATIENTS** — patient profiles, demographics, medical history, consent records
- **PROVIDERS** — doctors, therapists, staff profiles, specialties, license verification
- **APPOINTMENTS** — scheduling, availability, reminders, teleconsult vs in-person
- **RECORDS** — clinical notes, prescriptions, lab results, imaging — highly regulated
**Key invariants:**
- Patient records access controlled per provider — no cross-provider data leakage (HIPAA/DPDP)
- All access to patient records logged — who viewed what and when (audit trail — Law 6)
- Records never deleted — only deactivated (regulatory requirement — Law 3)
- Consent required before data sharing — consent is versioned and timestamped
- Prescription data requires licensed provider role — role check every write
**State machine:** Appointment → SCHEDULED → CONFIRMED → IN_PROGRESS → COMPLETED | CANCELLED | NO_SHOW

---

## Cross-Domain Interaction Rules

| From domain | To domain | Allowed method | Forbidden |
|-------------|-----------|----------------|-----------|
| Payments | Orders | `ordersService.confirmOrder()` | `prisma.order.update()` |
| Orders | Inventory | `inventoryService.decrementStock()` | `prisma.product.update({ stock })` |
| Cart | Catalog | `productsService.getProduct()` | `prisma.product.update()` |
| Fulfillment | Orders | `ordersService.markShipped()` | `prisma.order.update()` |
| Any | Communication | emit event or queue dispatch | inline `mailerService.send()` inside $transaction |
| Any | Analytics | emit event | synchronous analytics call in business logic |
