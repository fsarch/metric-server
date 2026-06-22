import { IsString, MaxLength, IsOptional, IsUUID } from 'class-validator';

export class CreateMetricDto {
  @IsString()
  @MaxLength(2048)
  name: string;

  @IsUUID()
  metricTypeId: string;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  externalId?: string;
}
