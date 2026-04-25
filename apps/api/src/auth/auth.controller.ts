import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('google')
    async googleLogin(@Body() dto: GoogleLoginDto) {
        return this.authService.googleLogin(dto);
    }

    @Post('pin')
    async pinLogin(@Body() dto: any) { // Usamos any temporalmente para evitar problemas de importacion si el DTO falla, pero idealmente PinLoginDto
        return this.authService.loginWithPin(dto.pin);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMe(@Req() req: any) {
        const userId = req.user.userId;
        const user = await this.authService.getMe(userId);
        return { authenticated: true, user };
    }

    @Post('register')
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('verify')
    verify(@Body() body: { email: string; code: string }) {
        return this.authService.verifyEmail(body.email, body.code);
    }

    @Post('login')
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @UseGuards(JwtAuthGuard)
    @Post('profile')
    updateProfile(@Req() req: any, @Body() body: any) {
        return this.authService.updateProfile(req.user.userId, body);
    }

    @UseGuards(JwtAuthGuard)
    @Post('change-password')
    async changePassword(@Req() req: any, @Body() body: any) {
        return this.authService.updatePassword(req.user.userId, body.currentPassword, body.newPassword);
    }
}
