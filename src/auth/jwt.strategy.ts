import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    console.log('Payload JWT Strategy: ', JSON.stringify(payload, null, 2));
    const userId = payload.id || payload.uid;
    // data ini masuk ke req.user
    return { id: userId, email: payload.email, role: payload.role };
  }
}
