import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { PartitionService } from './partition.service.js';
import { MeasurementPartition } from '../database/entities/measurement-partition.entity.js';

// Partition cache configuration
// No TTL - partitions are static and rarely change
const PARTITION_CACHE_TTL_MS = 0; // No expiry

@Module({
  imports: [
    TypeOrmModule.forFeature([MeasurementPartition]),
    CacheModule.register({
      ttl: PARTITION_CACHE_TTL_MS,
      max: 1000,
    }),
  ],
  providers: [PartitionService],
  exports: [PartitionService, CacheModule],
})
export class ServicesModule {}
