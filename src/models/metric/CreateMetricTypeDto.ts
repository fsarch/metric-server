import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMetricTypeDto {
  @ApiProperty({
    description: 'Name of the metric type',
    example: 'cpu_usage',
  })
  @IsString()
  @MaxLength(2048)
  name: string;

  @ApiProperty({
    description: 'External identifier for the metric type',
    required: false,
    example: 'external-cpu-123',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2048)
  externalId?: string;
}
