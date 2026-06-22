import { ApiProperty } from '@nestjs/swagger';

export class MeasurementDto {
  @ApiProperty({
    description: 'Metric ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  metricId: string;

  @ApiProperty({
    description: 'Log timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  logTime: Date;

  @ApiProperty({
    description: 'Measurement value',
    example: 75.5,
  })
  value: number;

  @ApiProperty({
    description: 'Additional metadata',
    nullable: true,
    example: { unit: 'percent', source: 'prometheus' },
  })
  meta: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Whether this measurement is in warm tier',
    example: true,
  })
  isWarmTier: boolean;
}
