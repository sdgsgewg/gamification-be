import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    // Allow requests without JWT
    return super.canActivate(context) || true;
  }

  handleRequest(err: any, user: any, info: any) {
    // Jika user tidak ada, jangan lempar error, biarkan null
    return user || null;
  }
}
