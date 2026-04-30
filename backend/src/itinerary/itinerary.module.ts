/*
 * @Author: taotaozi-pro 2667534364@qq.com
 * @Date: 2025-06-27 10:54:10
 * @LastEditors: taotaozi-pro 2667534364@qq.com
 * @LastEditTime: 2025-06-27 10:54:54
 * @FilePath: \Motivate\backend\src\itinerary\itinerary.module.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { Module } from '@nestjs/common';
import { ItineraryController } from './itinerary.controller';
import { ItineraryService } from './itinerary.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { AmapModule } from '../amap/amap.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [AuthModule, AmapModule, LlmModule],
  controllers: [ItineraryController],
  providers: [ItineraryService, PrismaService]
})
export class ItineraryModule {}
