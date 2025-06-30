import { IsEmail, IsString, MinLength } from 'class-validator';

// We will add class-validator decorators later
export class LoginUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
} 