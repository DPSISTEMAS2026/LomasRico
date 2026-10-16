import { Controller, Post, Get, Body, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ANY_USER_ROLES, Public } from './access';
import { Roles } from './roles.decorator';
import { LoginThrottle } from './login-throttle';

@Controller('auth')
export class AuthController {
    private readonly throttle = new LoginThrottle();

    constructor(private readonly authService: AuthService) { }

    @Public()
    @Post('google')
    async googleLogin(@Body() dto: GoogleLoginDto, @Req() req: any) {
        return this.throttle.run(req, () => this.authService.googleLogin(dto));
    }

    @Public()
    @Post('pin')
    async pinLogin(@Body() dto: any, @Req() req: any) {
        return this.throttle.run(req, () => this.authService.loginWithPin(dto?.pin));
    }

    @Roles(...ANY_USER_ROLES)
    @Get('me')
    async getMe(@Req() req: any) {
        const userId = req.user.userId;
        const user = await this.authService.getMe(userId);
        return { authenticated: true, user };
    }

    @Public()
    @Post('register')
    register(@Body() dto: RegisterDto, @Req() req: any) {
        return this.throttle.run(req, () => this.authService.register(dto));
    }

    @Public()
    @Post('verify')
    verify(@Body() body: { email: string; code: string }, @Req() req: any) {
        return this.throttle.run(req, () => this.authService.verifyEmail(body.email, body.code));
    }

    @Public()
    @Post('login')
    login(@Body() dto: LoginDto, @Req() req: any) {
        return this.throttle.run(req, () => this.authService.login(dto));
    }

    @Public()
    @Post('forgot-password')
    forgotPassword(@Body() body: { emailOrPhone?: string; identifier?: string }, @Req() req: any) {
        const id = body?.emailOrPhone ?? body?.identifier ?? '';
        return this.throttle.run(req, () => this.authService.forgotPassword(id));
    }

    @Roles(...ANY_USER_ROLES)
    @Post('profile')
    updateProfile(@Req() req: any, @Body() body: any) {
        return this.authService.updateProfile(req.user.userId, body);
    }

    @Roles(...ANY_USER_ROLES)
    @Post('change-password')
    async changePassword(@Req() req: any, @Body() body: any) {
        return this.authService.updatePassword(req.user.userId, body.currentPassword, body.newPassword);
    }
}
