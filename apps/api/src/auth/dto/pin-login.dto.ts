
import { IsString, Length } from 'class-validator';

export class PinLoginDto {
    @IsString()
    @Length(4, 4)
    pin: string;
}
