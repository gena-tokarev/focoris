import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthJwtPayload } from '../auth.types';

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): AuthJwtPayload => {
    const request = context.switchToHttp().getRequest<{
      user: AuthJwtPayload;
    }>();
    return request.user;
  },
);
