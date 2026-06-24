import { ApiProperty } from '@nestjs/swagger';

export class AggregatedMeasurementDto {
  @ApiProperty({
    description: 'Start time of the aggregation interval',
    example: '2024-01-15T00:00:00.000Z',
  })
  startTime: string;

  @ApiProperty({
    description: 'End time of the aggregation interval',
    example: '2024-01-16T00:00:00.000Z',
  })
  endTime: string;

  @ApiProperty({
    description: 'Aggregated value for the interval',
    example: 75.5,
  })
  value: number;
}
