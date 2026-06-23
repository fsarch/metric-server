import { IsUUID, IsDateString, IsOptional, IsEnum } from 'class-validator';

export type AggregationType = 'avg' | 'sum' | 'min' | 'max' | 'count';
export type IntervalType = 'hour' | 'day' | 'week' | 'month';

export class AggregateMeasurementsDto {
  @IsDateString()
  startTime: string | Date;

  @IsDateString()
  endTime: string | Date;

  @IsOptional()
  @IsEnum(['hour', 'day', 'week', 'month'])
  interval: IntervalType = 'hour';

  @IsOptional()
  @IsEnum(['avg', 'sum', 'min', 'max', 'count'])
  aggregation: AggregationType = 'avg';

  @IsOptional()
  warmTierOnly: boolean = true;
}
