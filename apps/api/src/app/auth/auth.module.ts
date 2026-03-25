import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

/** Default 8h; invalid env would make jsonwebtoken throw on sign → login 500. */
const DEFAULT_JWT_EXPIRES_SEC = 28800;

function jwtExpiresSec(config: ConfigService): number {
  const raw = config.get<string | undefined>('JWT_EXPIRES_SEC');
  if (raw === undefined || String(raw).trim() === '') {
    return DEFAULT_JWT_EXPIRES_SEC;
  }
  const n = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n <= 0) {
    return DEFAULT_JWT_EXPIRES_SEC;
  }
  return n;
}

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: jwtExpiresSec(config),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
