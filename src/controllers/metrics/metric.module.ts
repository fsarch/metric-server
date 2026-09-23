import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Metric } from '../../database/entities/metric.entity.js';
import { MetricType } from '../../database/entities/metric-type.entity.js';
import { Measurement } from '../../database/index.js';
import { MetricController } from './metric.controller.js';
import { MetricService } from './metric.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([MetricType, Metric, Measurement])],
  controllers: [MetricController],
  providers: [MetricService],
  exports: [MetricService],
})
export class MetricModule {}
