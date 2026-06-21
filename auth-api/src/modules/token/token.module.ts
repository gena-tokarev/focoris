import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { IdentityModule } from '../identity/identity.module';
import { TokenService } from './token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [ConfigModule, PrismaModule, IdentityModule, JwtModule.register({})],
  providers: [TokenService, JwtStrategy],
  exports: [TokenService],
})
export class TokenModule {}
