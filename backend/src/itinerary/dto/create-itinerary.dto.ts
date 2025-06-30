import { IsString, IsNotEmpty, IsOptional, IsDateString, IsArray, IsNumber } from 'class-validator';
import { CreatePlanItemDto } from './create-plan-item.dto';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class CreateItineraryDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePlanItemDto)
  planItems?: CreatePlanItemDto[];

  @IsNumber()
  @IsOptional()
  budget?: number;

  @IsNumber()
  @IsOptional()
  estimatedCost?: number;
} 