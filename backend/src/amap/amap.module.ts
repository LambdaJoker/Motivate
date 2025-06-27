/*
 * @Author: taotaozi-pro 2667534364@qq.com
 * @Date: 2025-06-26 08:05:23
 * @LastEditors: taotaozi-pro 2667534364@qq.com
 * @LastEditTime: 2025-06-26 08:10:24
 * @FilePath: \Motivate\backend\src\amap\amap.module.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { Module } from '@nestjs/common';
import { AmapController } from './amap.controller';
import { AmapService } from './amap.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [AmapController],
  providers: [AmapService]
})
export class AmapModule {}
