import { Module } from '@nestjs/common';
import { MetricModule } from './metric/metric.module.js';
import { MeasurementModule } from './measurement/measurement.module.js';

@Module({
  imports: [MetricModule, MeasurementModule],
  exports: [MetricModule, MeasurementModule],
})
export class ControllersModule {}
