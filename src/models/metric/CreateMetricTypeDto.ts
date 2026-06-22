import { IsString, MaxLength, IsOptional } from 'class-validator';

export class CreateMetricTypeDto {
  @IsString()
  @MaxLength(2048)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  externalId?: string;
}
