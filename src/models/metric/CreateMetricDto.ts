import { IsString, MaxLength, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMetricDto {
  @ApiProperty({
    description: 'Name of the metric',
    example: 'cpu_usage_server1',
  })
  @IsString()
  @MaxLength(2048)
  name: string;

  @ApiProperty({
    description: 'ID of the metric type this metric belongs to',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  metricTypeId: string;

  @ApiProperty({
    description: 'External identifier for the metric',
    required: false,
    example: 'external-metric-123',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2048)
  externalId?: string;
}
