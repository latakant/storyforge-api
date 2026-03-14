```
╔══════════════════════════════════════════════════════════════════════╗
║  CERT  /dev-backend-auth  |  v8.0  |  TIER: 10  |  BUDGET: MODERATE ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L3 · L4 · L7 · L8                                   ║
║ AUTHORITY     ║ BUILDER                                              ║
║ CAN           ║ - Read + write src/modules/auth/                    ║
║               ║ - Read src/shared/guards/ · src/shared/decorators/  ║
║               ║ - Read src/modules/users/                           ║
║               ║ - Run npx tsc --noEmit                              ║
║               ║ - Run npx jest --testPathPattern=auth               ║
║ CANNOT        ║ - Modify schema.prisma (use /cortex-migrate)        ║
║               ║ - Change JWT algorithm or key size without PA       ║
║               ║ - Add new auth providers without PA Phase 3         ║
║ REQUIRES      ║ - MASTER-v8.0.md loaded                            ║
║ ESCALATES     ║ - Token compared with === → HARD HALT (timing attack) ║
║               ║ - Auth bypass found → HARD HALT                     ║
║ OUTPUTS       ║ - Auth code (guard, strategy, decorator, or flow)   ║
║               ║ - Completion block: COMPLETE or HARD HALT           ║
╚═══════════════╩══════════════════════════════════════════════════════╝
```

NestJS authentication patterns — JWT, refresh tokens, OTP, RBAC, guards, decorators.

$ARGUMENTS

Parse: `task` — `guard` | `strategy` | `otp` | `refresh` | `decorator` | `rbac` | `audit`

---

## CONTEXT: Exena Auth Architecture

```
JWT (15min access token) + Refresh token (7 days)
OTP via MSG91 SMS → verifies phone
Roles: CUSTOMER | ADMIN | VENDOR | DELIVERY_AGENT
Guards: JwtAuthGuard (passport) + RolesGuard (custom)
Decorators: @CurrentUser() → User from JWT payload
Token storage: access token in memory / cookie, refresh in HttpOnly cookie
```

---

## PATTERN A — JwtAuthGuard

```typescript
// src/shared/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

```typescript
// src/shared/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'

interface JwtPayload {
  sub: string    // userId
  email: string
  role: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    })
  }

  validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email, role: payload.role }
  }
}
```

---

## PATTERN B — RolesGuard + @Roles decorator

```typescript
// src/shared/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common'
export const ROLES_KEY = 'roles'
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)
```

```typescript
// src/shared/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { Role } from '@prisma/client'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required) return true  // No @Roles = any authenticated user

    const { user } = context.switchToHttp().getRequest()
    return required.includes(user.role)
  }
}
```

**Usage in controller:**
```typescript
@Get('admin-only')
@UseGuards(JwtAuthGuard, RolesGuard)  // ORDER MATTERS: JWT first, then roles
@Roles(Role.ADMIN)
async adminRoute() { ... }
```

---

## PATTERN C — @CurrentUser() decorator

```typescript
// src/shared/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    return request.user  // Set by JwtStrategy.validate()
  },
)
```

```typescript
// Usage:
async getProfile(@CurrentUser() user: User): Promise<UserProfile> {
  return this.usersService.findById(user.id)
}
```

---

## PATTERN D — OTP Flow

```typescript
// src/modules/auth/otp.service.ts
async sendOtp(phone: string): Promise<void> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString()  // 6 digits
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)  // 10 minutes

  await this.prisma.$transaction([
    this.prisma.otpVerification.deleteMany({ where: { phone } }),  // invalidate old
    this.prisma.otpVerification.create({ data: { phone, otp, expiresAt } }),
  ])

  await this.msg91.sendSMS(phone, `Your Exena OTP: ${otp}. Valid for 10 minutes.`)
}

async verifyOtp(phone: string, otp: string): Promise<boolean> {
  const record = await this.prisma.otpVerification.findFirst({
    where: { phone, otp, expiresAt: { gt: new Date() } },
  })

  if (!record) return false

  await this.prisma.otpVerification.delete({ where: { id: record.id } })  // single-use
  return true
}
```

---

## PATTERN E — Refresh Token Flow

```typescript
async refreshTokens(refreshToken: string): Promise<{ accessToken: string }> {
  let payload: { sub: string; type: string }
  try {
    payload = this.jwt.verify(refreshToken, { secret: process.env.JWT_REFRESH_SECRET })
  } catch {
    throw new UnauthorizedException('Invalid or expired refresh token')
  }

  if (payload.type !== 'refresh') throw new UnauthorizedException('Wrong token type')

  const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user || !user.isActive) throw new UnauthorizedException('User not found or inactive')

  const accessToken = this.jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    { secret: process.env.JWT_SECRET, expiresIn: '15m' }
  )
  return { accessToken }
}
```

---

## AUTH AUDIT

When `task=audit`, check:

1. Every controller route has explicit guard or is documented as `// PUBLIC`
2. No `===` comparison for tokens (use `crypto.timingSafeEqual`)
3. JWT_SECRET and JWT_REFRESH_SECRET are different values
4. Refresh tokens are invalidated on logout
5. OTP is single-use and time-limited
6. Passwords hashed with bcrypt (cost factor ≥ 12)
7. Rate limiting on `/auth/login`, `/auth/otp/send`

---

## COMPLETION BLOCK

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /dev-backend-auth               COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Task       [guard | strategy | otp | refresh | audit]
Files      [list of files created/modified]
Verified   tsc ✅ | tests ✅
Next       /cortex-commit "feat(auth): [what was added]"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
