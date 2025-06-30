/*
 * @Author: taotaozi-pro 2667534364@qq.com
 * @Date: 2025-06-29 22:19:40
 * @LastEditors: taotaozi-pro 2667534364@qq.com
 * @LastEditTime: 2025-06-30 10:44:09
 * @FilePath: \Motivate\backend\src\itinerary\dto\generate-itinerary.dto.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { IsString, IsOptional, IsArray, IsInt, IsIn } from 'class-validator';

export class GenerateItineraryDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  startDate: string;

  @IsInt()
  durationDays: number;

  @IsString()
  destination: string;

  @IsString()
  @IsOptional()
  origin?: string;

  @IsInt()
  @IsOptional()
  budget?: number;

  @IsArray()
  @IsString({ each: true })
  mustVisitSpots: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  optionalSpots?: string[];

  @IsString()
  @IsOptional()
  @IsIn(['driving', 'walking', 'bicycling', 'transit'])
  transportMode?: string;
} 