import { Module } from '@nestjs/common';
import { MetricModule } from '../metric/metric.module.js';
import { MetricTypeController } from './metric-type.controller.js';

@Module({
  imports: [MetricModule],
  controllers: [MetricTypeController],
})
export class MetricTypeModule {}
