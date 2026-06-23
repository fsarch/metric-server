import { IsUUID, IsDateString, IsNumber, IsOptional, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMeasurementDto {
  @ApiProperty({
    description: 'ID of the metric this measurement belongs to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  metricId: string;

  @ApiProperty({
    description: 'Timestamp when the measurement was logged',
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsDateString()
  logTime: string | Date;

  @ApiProperty({
    description: 'Numeric value of the measurement',
    example: 75.5,
  })
  @IsNumber({}, { message: 'Value must be a number' })
  value: number;

  @ApiProperty({
    description: 'Additional metadata for the measurement',
    required: false,
    example: { unit: 'percent', source: 'prometheus' },
  })
  @ValidateIf((o) => o.meta !== undefined)
  @IsOptional()
  meta: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Whether this measurement should be stored in warm tier',
    required: false,
    example: true,
  })
  @IsOptional()
  isWarmTier?: boolean;
}
