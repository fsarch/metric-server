import { Module } from '@nestjs/common';
import { MeasurementModule } from '../../measurements/measurement.module.js';
import { MeasurementController } from './measurement.controller.js';

@Module({
  imports: [MeasurementModule],
  controllers: [MeasurementController],
})
export class MetricMeasurementsModule {}
