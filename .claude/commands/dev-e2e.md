╔══════════════════════════════════════════════════════════════════════╗
║  CERT  /dev-e2e  |  v8.0  |  TIER: 8  |  BUDGET: MODERATE         ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L1 · L7 · L8                                        ║
║ AUTHORITY     ║ BUILDER                                              ║
║ CAN           ║ - Write Playwright test files in tests/e2e/         ║
║               ║ - Write page object models in tests/e2e/pages/      ║
║               ║ - Write playwright.config.ts                        ║
║               ║ - Read src/ files to understand flows               ║
║ CANNOT        ║ - Modify application source code                    ║
║               ║ - Run tests in production environment               ║
║ REQUIRES      ║ - MASTER-v8.0.md loaded                             ║
║ OUTPUTS       ║ - Playwright test files · POM classes · config      ║
║               ║ - Completion block (COMPLETE)                       ║
╚═══════════════╩══════════════════════════════════════════════════════╝

Write Playwright E2E tests for critical user flows.
Covers: Page Object Model, test organization, flaky test patterns,
CI/CD integration, and cross-browser setup.

$ARGUMENTS

Parse from $ARGUMENTS:
- `<flow-name>` — which user flow to test (e.g., "checkout", "login", "search")
- `--pom` — generate Page Object Model class only
- `--config` — generate/update playwright.config.ts only
- `--fix-flaky` — analyze and fix flaky tests

---

## WHEN TO WRITE E2E TESTS

Write E2E tests for:
- Authentication flows (login, OTP, logout, session expiry)
- Checkout and payment flows (cart → order → confirmation)
- Search and filter flows
- Admin CRUD operations (product create/edit/delete)
- Critical error paths (payment failure, out of stock)

Skip E2E for:
- Unit-testable logic (pure functions, calculations)
- Simple component rendering (use unit tests)
- Already-covered API endpoints (use integration tests)

**Rule:** E2E tests cover USER JOURNEYS, not implementation details.

---

## FILE STRUCTURE

```
tests/
  e2e/
    pages/                   ← Page Object Models
      login.page.ts
      checkout.page.ts
      product.page.ts
      admin/
        products.page.ts
    flows/                   ← Test suites by flow
      auth.spec.ts
      checkout.spec.ts
      search.spec.ts
      admin-products.spec.ts
    fixtures/                ← Test data + helpers
      test-data.ts
      auth.fixture.ts
playwright.config.ts
```

---

## PAGE OBJECT MODEL (POM)

Never select DOM elements directly in test files. All selectors go in Page Objects.

```typescript
// tests/e2e/pages/checkout.page.ts
import { Page, Locator, expect } from '@playwright/test'

export class CheckoutPage {
  readonly page: Page
  readonly cartIcon: Locator
  readonly checkoutButton: Locator
  readonly addressSelect: Locator
  readonly payOnlineButton: Locator
  readonly payCodButton: Locator
  readonly orderConfirmation: Locator
  readonly orderNumber: Locator

  constructor(page: Page) {
    this.page = page
    this.cartIcon = page.getByTestId('cart-icon')
    this.checkoutButton = page.getByRole('button', { name: 'Proceed to Checkout' })
    this.addressSelect = page.getByTestId('address-select')
    this.payOnlineButton = page.getByRole('button', { name: 'Pay Online' })
    this.payCodButton = page.getByRole('button', { name: 'Cash on Delivery' })
    this.orderConfirmation = page.getByTestId('order-confirmation')
    this.orderNumber = page.getByTestId('order-number')
  }

  async goto() {
    await this.page.goto('/cart')
  }

  async selectAddress(addressId: string) {
    await this.addressSelect.selectOption(addressId)
  }

  async placeOrderCOD(): Promise<string> {
    await this.payCodButton.click()
    await expect(this.orderConfirmation).toBeVisible({ timeout: 10_000 })
    return (await this.orderNumber.textContent()) ?? ''
  }
}
```

**Selector priority (best → worst):**
1. `getByRole()` — accessible, resilient to UI changes
2. `getByTestId()` — explicit test-only ID (`data-testid`)
3. `getByLabel()` — for form fields
4. `getByText()` — for unique visible text
5. `locator('.css-class')` — last resort, brittle

---

## TEST FILE PATTERN

```typescript
// tests/e2e/flows/checkout.spec.ts
import { test, expect } from '@playwright/test'
import { CheckoutPage } from '../pages/checkout.page'
import { LoginPage } from '../pages/login.page'
import { ProductPage } from '../pages/product.page'
import { TEST_USER, TEST_PRODUCT } from '../fixtures/test-data'

test.describe('Checkout Flow', () => {
  let checkoutPage: CheckoutPage
  let loginPage: LoginPage
  let productPage: ProductPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    productPage = new ProductPage(page)
    checkoutPage = new CheckoutPage(page)

    // Authenticate before each test
    await loginPage.loginWithOTP(TEST_USER.phone)
    // Add product to cart
    await productPage.goto(TEST_PRODUCT.id)
    await productPage.addToCart()
  })

  test('should complete COD checkout successfully', async () => {
    await checkoutPage.goto()
    await checkoutPage.selectAddress(TEST_USER.addressId)
    const orderNumber = await checkoutPage.placeOrderCOD()

    expect(orderNumber).toMatch(/^EX-\d{6}$/)
  })

  test('should show error when no address selected', async () => {
    await checkoutPage.goto()
    await checkoutPage.payCodButton.click()

    await expect(checkoutPage.page.getByText('Please select a delivery address')).toBeVisible()
  })

  test('should show out-of-stock message when product unavailable', async ({ page }) => {
    // Simulate out-of-stock (requires API mock or test DB state)
    await page.route('**/api/cart', (route) => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({ message: 'Product is out of stock' })
      })
    })

    await checkoutPage.goto()
    await expect(page.getByText('out of stock')).toBeVisible()
  })
})
```

---

## PLAYWRIGHT CONFIG

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,       // retry on CI, not locally
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

---

## FLAKY TEST PATTERNS + FIXES

### Pattern 1: Race condition (most common)
```typescript
// WRONG — element may not exist yet
await page.click('[data-testid="submit"]')
await expect(page.getByText('Success')).toBeVisible()  // sometimes misses

// CORRECT — wait for network to settle
await Promise.all([
  page.waitForResponse('**/api/orders'),
  page.click('[data-testid="submit"]'),
])
await expect(page.getByText('Success')).toBeVisible()
```

### Pattern 2: Animation timing
```typescript
// WRONG — element visible but still animating
await page.click('[data-testid="modal-trigger"]')
await expect(page.getByRole('dialog')).toBeVisible()
await page.click('[data-testid="confirm"]')  // clicks through animation

// CORRECT — wait for animation to complete
await page.click('[data-testid="modal-trigger"]')
const dialog = page.getByRole('dialog')
await expect(dialog).toBeVisible()
await dialog.waitFor({ state: 'stable' })  // or use animation-end event
await page.click('[data-testid="confirm"]')
```

### Pattern 3: Test data collision (parallel tests)
```typescript
// WRONG — parallel tests share same phone number → OTP conflicts
const TEST_PHONE = '9876543210'

// CORRECT — unique per test run
const TEST_PHONE = `98765${Date.now().toString().slice(-5)}`
```

### Pattern 4: Quarantine flaky tests while fixing
```typescript
// Mark as known-flaky — don't delete, don't skip silently
test.fixme('should complete Razorpay payment', async () => {
  // FIXME: flaky on CI due to Razorpay sandbox timeouts
  // Tracking: issue #142
})
```

---

## API MOCKING

Mock external services in E2E tests — never call Razorpay/MSG91 in test suite.

```typescript
// fixtures/auth.fixture.ts — mock OTP verification
test.beforeEach(async ({ page }) => {
  // Intercept OTP verification — always return success with test OTP
  await page.route('**/api/auth/verify-otp', async (route) => {
    const body = route.request().postDataJSON()
    if (body.otp === '123456') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          accessToken: 'test-token-abc',
          refreshToken: 'test-refresh-abc',
          user: { id: 'user-test-01', phone: body.phone, role: 'CUSTOMER' }
        })
      })
    } else {
      await route.continue()
    }
  })
})
```

---

## CI/CD INTEGRATION

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - name: Run E2E tests
        run: npx playwright test --project=chromium
        env:
          E2E_BASE_URL: http://localhost:3000
          NODE_ENV: test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

---

## SEARCH-FIRST CHECKLIST

Before writing any E2E test:

- [ ] Does this user flow have a Page Object Model? Search `tests/e2e/pages/`
- [ ] Is there already a test for this flow? Search `tests/e2e/flows/`
- [ ] Are external APIs mocked? (Razorpay, MSG91, Shiprocket)
- [ ] Is test data unique to avoid parallel test collisions?
- [ ] Are selectors using role/testId (not CSS classes)?
- [ ] Does each test have an independent `beforeEach` setup?

---

## COMMON MISTAKES

| Mistake | Correct pattern |
|---------|-----------------|
| CSS class selectors | `getByRole()` or `getByTestId()` |
| No `beforeEach` isolation | Each test sets up its own state |
| Shared test data (phone, email) | Unique per test run (`Date.now()`) |
| Calling real APIs in tests | Mock with `page.route()` |
| `page.waitForTimeout(2000)` | `waitForResponse()` or `toBeVisible()` |
| Silent `test.skip()` | `test.fixme()` with issue reference |
| Testing implementation details | Test user-visible outcomes only |
| No CI artifact upload | Upload report + screenshots on failure |

---

## COMPLETION

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /dev-e2e                        COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Flow       {flow-name}
Files      {n} test files · {n} POM classes
Tests      {n} scenarios (happy path + error paths)
Mocked     {list of mocked external APIs}
Logged     LAYER_LOG · {date}
Next       npx playwright test --project=chromium
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
