import { IsString, IsEmail, MinLength } from 'class-validator';

// We will add class-validator decorators later
export class CreateUserDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
} 