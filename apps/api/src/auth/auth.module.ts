import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy, jwtSecret } from './jwt.strategy';
import { MailModule } from '../mail/mail.module';

@Module({
    imports: [
        PassportModule,
        MailModule,
        JwtModule.register({
            secret: jwtSecret(),
            signOptions: { expiresIn: '7d' },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule { }
