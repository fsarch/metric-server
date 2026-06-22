import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartitionService } from './partition.service.js';
import { MeasurementPartition } from '../database/entities/measurement-partition.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([MeasurementPartition])],
  providers: [PartitionService],
  exports: [PartitionService],
})
export class ServicesModule {}
