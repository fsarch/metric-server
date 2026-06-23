import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeasurementController } from './measurement.controller.js';
import { MeasurementService } from './measurement.service.js';
import { Measurement } from '../../database/entities/measurement.entity.js';
import { MeasurementPartition } from '../../database/entities/measurement-partition.entity.js';
import { ServicesModule } from '../../services/services.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Measurement, MeasurementPartition]),
    ServicesModule,
  ],
  controllers: [MeasurementController],
  providers: [MeasurementService],
  exports: [MeasurementService],
})
export class MeasurementModule {}
