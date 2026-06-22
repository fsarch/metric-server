import { IsUUID, IsDateString, IsOptional, IsNumber } from 'class-validator';

export class QueryMeasurementsDto {
  @IsUUID()
  @IsOptional()
  metricId?: string;

  @IsDateString()
  @IsOptional()
  startTime?: string | Date;

  @IsDateString()
  @IsOptional()
  endTime?: string | Date;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsNumber()
  @IsOptional()
  offset?: number;

  @IsOptional()
  warmTierOnly?: boolean;
}
