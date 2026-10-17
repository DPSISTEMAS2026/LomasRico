import { IsString, MinLength } from 'class-validator';

/** `email` acepta correo o celular (compat con el front). */
export class LoginDto {
    @IsString()
    @MinLength(3)
    email: string;

    @IsString()
    @MinLength(4)
    password: string;
}
