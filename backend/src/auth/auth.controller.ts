/*
 * @Author: taotaozi-pro 2667534364@qq.com
 * @Date: 2025-06-27 10:26:48
 * @LastEditors: taotaozi-pro 2667534364@qq.com
 * @LastEditTime: 2025-06-30 10:27:32
 * @FilePath: \Motivate\backend\src\auth\auth.controller.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { Public } from './decorator/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('/register')
  register(@Body(ValidationPipe) createUserDto: CreateUserDto): Promise<{ message: string }> {
    // In a real app, you'd probably want to transform the DTO or handle password separately,
    // but for simplicity, we pass it to the service.
    // The DTO name mismatch (password_hash) is intentional to follow the user's request,
    // but in a real app, it should be named 'password'.
    return this.authService.register(createUserDto);
  }

  @Public()
  @Post('/login')
  login(@Body(ValidationPipe) loginUserDto: LoginUserDto): Promise<{ accessToken: string }> {
    return this.authService.login(loginUserDto);
  }
}
