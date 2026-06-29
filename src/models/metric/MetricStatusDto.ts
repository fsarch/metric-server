import { ApiProperty } from '@nestjs/swagger';

export class MetricStatusDto {
  @ApiProperty({
    description: 'Total number of measurements for this metric',
    example: 1500,
  })
  totalMeasurements: number;

  @ApiProperty({
    description: 'Timestamp of the first measurement',
    nullable: true,
    example: '2024-01-15T10:30:00.000Z',
  })
  firstMeasurementAt: Date | null;

  @ApiProperty({
    description: 'Timestamp of the last measurement',
    nullable: true,
    example: '2024-06-28T15:45:00.000Z',
  })
  lastMeasurementAt: Date | null;
}
