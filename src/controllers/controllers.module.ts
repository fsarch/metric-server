import { Module } from '@nestjs/common';
import { MetricModule } from './metric/metric.module.js';
import { MetricMeasurementsModule } from './metric/measurements/measurement.module.js';
import { MetricTypeModule } from './metric-type/metric-type.module.js';
import { MeasurementModule } from './measurements/measurement.module.js';

@Module({
  imports: [MetricModule, MetricMeasurementsModule, MetricTypeModule, MeasurementModule],
  exports: [MetricModule, MetricMeasurementsModule, MetricTypeModule, MeasurementModule],
})
export class ControllersModule {}
