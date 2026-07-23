import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '../../user/enums/user-role.enum';
import { RequestUser } from '../../auth/interfaces/request-user.interface';

/**
 * Allows the authenticated user to act on their own resource,
 * or any admin. Expects route param id to be the target user id.
 */
@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: RequestUser;
      params: { id?: string };
    }>();

    const currentUser = request.user;
    const targetId = request.params.id;

    if (!currentUser || !targetId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (currentUser.role === UserRole.ADMIN || currentUser.id === targetId) {
      return true;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
