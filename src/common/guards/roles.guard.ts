import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

interface RequestUser {
  id: string;
  email: string;
  role: Role;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator = any authenticated user is allowed
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user: RequestUser }>();
    return required.includes(request.user.role);
  }
}
