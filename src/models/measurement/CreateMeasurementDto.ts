import { IsUUID, IsDateString, IsNumber, IsOptional, ValidateIf } from 'class-validator';

export class CreateMeasurementDto {
  @IsUUID()
  metricId: string;

  @IsDateString()
  logTime: string | Date;

  @IsNumber({}, { message: 'Value must be a number' })
  value: number;

  @ValidateIf((o) => o.meta !== undefined)
  @IsOptional()
  meta: Record<string, unknown> | null;

  @IsOptional()
  isWarmTier?: boolean;
}
