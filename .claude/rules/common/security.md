# Security — Universal Rules

## Pre-Commit Security Checklist (MANDATORY)

Before EVERY commit:
- [ ] No hardcoded secrets (API keys, passwords, tokens, connection strings)
- [ ] All user inputs validated with DTOs + class-validator
- [ ] SQL injection prevented (parameterized queries — no string concatenation)
- [ ] Auth/authorization verified on every protected route
- [ ] Rate limiting on all public-facing endpoints
- [ ] Error messages don't leak internal details to clients
- [ ] No sensitive data (passwords, OTPs, tokens) in logs

## Secret Management

```typescript
// NEVER: hardcoded
const apiKey = "sk-abc123";

// ALWAYS: environment variable
const apiKey = process.env.RAZORPAY_KEY_SECRET;
if (!apiKey) throw new Error('RAZORPAY_KEY_SECRET not configured');
```

Validate all required secrets at application startup.

## Webhook Security

Always verify webhook signatures with constant-time comparison:
```typescript
import { timingSafeEqual } from 'crypto';

const expected = createHmac('sha256', secret).update(payload).digest('hex');
const safe = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
if (!safe) throw new UnauthorizedException('Invalid webhook signature');
```

Never use `===` for signature comparison (timing attack vulnerable).

## Security Response Protocol

If a security issue is found:
1. STOP immediately — flag before continuing
2. Use `security-reviewer` agent
3. Fix CRITICAL issues before any other work
4. Rotate exposed secrets immediately
5. Review full codebase for similar patterns
