import { IsString, IsNotEmpty, IsOptional, IsDateString, IsArray } from 'class-validator';
import { CreatePlanItemDto } from './create-plan-item.dto';

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

  @IsArray()
  @IsOptional()
  planItems?: CreatePlanItemDto[];
} 