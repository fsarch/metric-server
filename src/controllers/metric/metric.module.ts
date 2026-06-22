import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricTypeController, MetricController } from './metric.controller.js';
import { MetricService } from './metric.service.js';
import { MetricType } from '../../database/entities/metric-type.entity.js';
import { Metric } from '../../database/entities/metric.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([MetricType, Metric])],
  controllers: [MetricTypeController, MetricController],
  providers: [MetricService],
  exports: [MetricService],
})
export class MetricModule {}
