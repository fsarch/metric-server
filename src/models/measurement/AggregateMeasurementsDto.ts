import { IsDateString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export type AggregationType = 'avg' | 'sum' | 'min' | 'max' | 'count';
export type IntervalType = 'hour' | 'day' | 'week' | 'month';

export class AggregateMeasurementsDto {
  @ApiProperty({
    description: 'Start time for the aggregation range',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsDateString()
  startTime: string | Date;

  @ApiProperty({
    description: 'End time for the aggregation range',
    example: '2024-01-31T23:59:59.999Z',
  })
  @IsDateString()
  endTime: string | Date;

  @ApiProperty({
    description: 'Time interval for aggregation',
    enum: ['hour', 'day', 'week', 'month'],
    example: 'hour',
  })
  @IsOptional()
  @IsEnum(['hour', 'day', 'week', 'month'])
  interval: IntervalType = 'hour';

  @ApiProperty({
    description: 'Type of aggregation to perform',
    enum: ['avg', 'sum', 'min', 'max', 'count'],
    example: 'avg',
  })
  @IsOptional()
  @IsEnum(['avg', 'sum', 'min', 'max', 'count'])
  aggregation: AggregationType = 'avg';

  @ApiProperty({
    description: 'Whether to only aggregate warm tier data',
    example: true,
  })
  @IsOptional()
  warmTierOnly: boolean = true;
}
