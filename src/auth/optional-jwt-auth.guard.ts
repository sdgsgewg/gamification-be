// import { Injectable, ExecutionContext } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';
// import { firstValueFrom, isObservable } from 'rxjs';

// @Injectable()
// export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     try {
//       const result = super.canActivate(context);
//       if (isObservable(result)) {
//         await firstValueFrom(result);
//       } else if (result instanceof Promise) {
//         await result;
//       }
//       return true;
//     } catch (_error) {
//       // gunakan prefix _ agar lint tidak complain
//       return true;
//     }
//   }

//   handleRequest(_err: any, user: any, _info: any) {
//     // sama di sini
//     return user || null;
//   }
// }

import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info) {
    // Kalau token tidak valid → treat as guest (user = null)
    if (err || info) return null;
    return user;
  }

  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();

    // Kalau tidak ada Authorization header → guest mode
    const authHeader = req.headers['authorization'];
    if (!authHeader) return true;

    // Kalau ada Authorization → tetap validasi JWT
    return super.canActivate(context);
  }
}
