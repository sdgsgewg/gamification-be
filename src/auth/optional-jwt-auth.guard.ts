import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { firstValueFrom, isObservable } from 'rxjs';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = super.canActivate(context);
      if (isObservable(result)) {
        await firstValueFrom(result);
      } else if (result instanceof Promise) {
        await result;
      }
      return true;
    } catch (_error) {
      // ✅ gunakan prefix _ agar lint tidak complain
      return true;
    }
  }

  handleRequest(_err: any, user: any, _info: any) {
    // ✅ sama di sini
    return user || null;
  }
}
