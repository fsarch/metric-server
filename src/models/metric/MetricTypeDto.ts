import { ApiProperty } from '@nestjs/swagger';

export class MetricTypeDto {
  @ApiProperty({
    description: 'Unique identifier of the metric type',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the metric type',
    example: 'cpu_usage',
  })
  name: string;

  @ApiProperty({
    description: 'External identifier for the metric type',
    nullable: true,
    example: 'external-cpu-123',
  })
  externalId: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  creationTime: Date;
}
