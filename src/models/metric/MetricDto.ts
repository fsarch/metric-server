import { ApiProperty } from '@nestjs/swagger';

export class MetricDto {
  @ApiProperty({
    description: 'Unique identifier of the metric',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the metric',
    example: 'cpu_usage_server1',
  })
  name: string;

  @ApiProperty({
    description: 'ID of the metric type',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  metricTypeId: string;

  @ApiProperty({
    description: 'External identifier for the metric',
    nullable: true,
    example: 'external-metric-123',
  })
  externalId: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  creationTime: Date;
}
