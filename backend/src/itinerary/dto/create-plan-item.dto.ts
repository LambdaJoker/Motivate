/*
 * @Author: taotaozi-pro 2667534364@qq.com
 * @Date: 2025-06-27 10:58:27
 * @LastEditors: taotaozi-pro 2667534364@qq.com
 * @LastEditTime: 2025-06-30 08:53:53
 * @FilePath: \Motivate\backend\src\itinerary\dto\create-plan-item.dto.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsNumber, IsEnum, IsDecimal } from 'class-validator';
import { TransportMode } from '@prisma/client';

export class CreatePlanItemDto {
  @IsDateString()
  @IsNotEmpty()
  planDate: string;

  @IsString()
  @IsNotEmpty()
  locationName: string;

  @IsString()
  @IsOptional()
  amapPoiId?: string;

  @IsDecimal()
  @IsNotEmpty()
  latitude: number;

  @IsDecimal()
  @IsNotEmpty()
  longitude: number;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsNumber()
  @IsOptional()
  durationMinutes?: number;

  @IsEnum(TransportMode)
  @IsOptional()
  transportMode?: TransportMode;

  @IsString()
  @IsOptional()
  notes?: string;
} 