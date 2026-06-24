import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between, DataSource, In } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Measurement } from '../../database/entities/measurement.entity.js';
import { MeasurementPartition } from '../../database/entities/measurement-partition.entity.js';
import { PartitionService } from '../../services/partition.service.js';
import { CreateMeasurementDto } from '../../models/measurement/CreateMeasurementDto.js';
import { AggregateMeasurementsDto } from '../../models/measurement/AggregateMeasurementsDto.js';

@Injectable()
export class MeasurementService {
  private readonly logger = new Logger(MeasurementService.name);

  constructor(
    @InjectRepository(Measurement)
    private readonly measurementRepository: Repository<Measurement>,
    private readonly partitionService: PartitionService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly dataSource: DataSource,
  ) {}

  async createMeasurement(
    metricId: string,
    dto: Omit<CreateMeasurementDto, 'metricId'>,
  ): Promise<Measurement> {
    const logTime = new Date(dto.logTime);

    // Ensure partition exists and get partition info (with caching)
    const { partition, isWarmTier: partitionIsWarmTier } = await this.ensurePartitionAndGetInfo(logTime);
    const isWarmTier = dto.isWarmTier !== undefined ? dto.isWarmTier : partitionIsWarmTier;

    const measurement = this.measurementRepository.create({
      metricId,
      logTime,
      value: dto.value,
      meta: dto.meta ?? null,
      isWarmTier,
    });

    try {
      return await this.measurementRepository.save(measurement);
    } catch (error) {
      // Handle unique constraint violation (duplicate metric_id + log_time)
      if (error.code === '23505' || error.message?.includes('duplicate key value violates unique constraint')) {
        throw new ConflictException(
          `Measurement with metricId ${metricId} and logTime ${logTime.toISOString()} already exists`,
        );
      }
      throw error;
    }
  }

  async createMeasurements(dtos: CreateMeasurementDto[]): Promise<Measurement[]> {
    if (dtos.length === 0) {
      return [];
    }

    // Use cache for partition info to minimize database queries
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      // Prepare all measurements and ensure partitions exist (with caching)
      const measurements: Measurement[] = [];
      for (const dto of dtos) {
        const logTime = new Date(dto.logTime);
        
        // Get partition info with caching (ensures partition exists and returns isWarmTier)
        const { isWarmTier: partitionIsWarmTier } = await this.ensurePartitionAndGetInfo(logTime);
        const isWarmTier = dto.isWarmTier !== undefined ? dto.isWarmTier : partitionIsWarmTier;
        
        const measurement = this.measurementRepository.create({
          metricId: dto.metricId,
          logTime,
          value: dto.value,
          meta: dto.meta ?? null,
          isWarmTier,
        });
        measurements.push(measurement);
      }
      
      // Bulk insert all measurements in a single query
      await queryRunner.manager.insert(Measurement, measurements);
      
      await queryRunner.commitTransaction();
      
      // Return the input DTOs as confirmation (with metricId and logTime)
      // We don't need to fetch from DB since we already have the data
      return measurements;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      
      // Handle unique constraint violation for bulk insert
      if (error.code === '23505' || error.message?.includes('duplicate key value violates unique constraint')) {
        // Extract duplicate keys from error message if possible
        const match = error.message?.match(/key \(([^)]+)\)/);
        const constraint = match ? match[1] : 'measurement_pkey';
        throw new ConflictException(
          `Duplicate measurement(s) found. A measurement with the same metricId and logTime already exists. Constraint: ${constraint}`,
        );
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async queryMeasurementsByMetric(
    metricId: string,
    startTime?: Date,
    endTime?: Date,
    limit: number = 1000,
    offset: number = 0,
    warmTierOnly: boolean = true,
  ): Promise<{
    data: Measurement[];
    total: number;
  }> {
    const where: Record<string, unknown> = {
      metricId,
    };

    // Always check warm tier first - this is the most important filter
    if (warmTierOnly) {
      where.isWarmTier = true;
    }

    if (startTime) {
      where.logTime = MoreThan(startTime);
    }

    if (endTime) {
      if (where.logTime) {
        where.logTime = Between(startTime, endTime);
      } else {
        where.logTime = LessThan(endTime);
      }
    }

    const [measurements, total] = await this.measurementRepository.findAndCount({
      where,
      order: { logTime: 'ASC' },
      take: limit,
      skip: offset,
    });

    return { data: measurements, total };
  }

  async getLatestMeasurementsByMetric(
    metricId: string,
    limit: number = 100,
    warmTierOnly: boolean = true,
  ): Promise<Measurement[]> {
    const where: Record<string, unknown> = {
      metricId,
    };

    // Check warm tier first for better performance
    if (warmTierOnly) {
      where.isWarmTier = true;
    }

    return this.measurementRepository.find({
      where,
      order: { logTime: 'DESC' },
      take: limit,
    });
  }

  async aggregateMeasurementsByMetric(
    metricId: string,
    dto: AggregateMeasurementsDto,
  ): Promise<
    Array<{ startTime: string; endTime: string; value: number }>
  > {
    const { startTime, endTime, interval, aggregation, warmTierOnly } = dto;
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // Build the date truncation expression based on interval
    const intervalExpression = this.getPostgresIntervalExpression(interval);

    // Build the aggregation function based on the requested aggregation
    const aggFunction = this.getPostgresAggregationFunction(aggregation);

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();

      const query = `
        SELECT 
          date_trunc('${intervalExpression}', log_time) as interval_start,
          ${aggFunction}(value) as result
        FROM measurement
        WHERE metric_id = '${metricId}'
          AND log_time >= '${startDate.toISOString()}'
          AND log_time <= '${endDate.toISOString()}'
          ${warmTierOnly ? 'AND is_warm_tier = true' : ''}
        GROUP BY interval_start
        ORDER BY interval_start
      `;

      const result = await queryRunner.query(query);
      const rows = result ?? [];

      const aggregated: Array<{ startTime: string; endTime: string; value: number }> = [];
      for (const row of rows) {
        const intervalStart = new Date(row.interval_start);

        // Calculate end time based on interval
        let intervalEnd: Date;
        let startTimeStr: string;
        let endTimeStr: string;

        if (interval === 'hour') {
          intervalEnd = new Date(intervalStart);
          intervalEnd.setUTCHours(intervalStart.getUTCHours() + 1);
          startTimeStr = intervalStart.toISOString().split(':')[0] + ':00:00';
          endTimeStr = intervalEnd.toISOString().split(':')[0] + ':00:00';
        } else if (interval === 'day') {
          intervalEnd = new Date(intervalStart);
          intervalEnd.setUTCDate(intervalStart.getUTCDate() + 1);
          startTimeStr = intervalStart.toISOString().split('T')[0];
          endTimeStr = intervalEnd.toISOString().split('T')[0];
        } else if (interval === 'week') {
          intervalEnd = new Date(intervalStart);
          intervalEnd.setUTCDate(intervalStart.getUTCDate() + 7);
          startTimeStr = intervalStart.toISOString().split('T')[0];
          endTimeStr = intervalEnd.toISOString().split('T')[0];
        } else if (interval === 'month') {
          intervalEnd = new Date(intervalStart);
          intervalEnd.setUTCMonth(intervalStart.getUTCMonth() + 1);
          const startYear = intervalStart.getUTCFullYear();
          const startMonth = String(intervalStart.getUTCMonth() + 1).padStart(2, '0');
          const endYear = intervalEnd.getUTCFullYear();
          const endMonth = String(intervalEnd.getUTCMonth() + 1).padStart(2, '0');
          startTimeStr = `${startYear}-${startMonth}-01`;
          endTimeStr = `${endYear}-${endMonth}-01`;
        } else {
          // Default: use the interval_start as both start and end
          startTimeStr = intervalStart.toISOString();
          endTimeStr = intervalStart.toISOString();
        }

        aggregated.push({
          startTime: startTimeStr,
          endTime: endTimeStr,
          value: parseFloat(row.result),
        });
      }

      return aggregated;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Ensures partition exists for the given date and returns partition info.
   * Uses cache-manager to avoid repeated database queries for the same partition.
   * Combines ensurePartitionForDate and getPartitionForDate into a single optimized call.
   */
  private async ensurePartitionAndGetInfo(logTime: Date): Promise<{ partition: MeasurementPartition | null; isWarmTier: boolean }> {
    const partitionStart = this.partitionService['getPartitionStartDate'](logTime);
    const partitionKey = partitionStart.toISOString();
    
    // Check cache first
    const cached: { partition: MeasurementPartition | null; isWarmTier: boolean } | undefined = await this.cacheManager.get(partitionKey);
    if (cached) {
      return cached;
    }
    
    // Ensure partition exists
    await this.partitionService.ensurePartitionForDate(logTime);
    
    // Get partition info
    const partition = await this.partitionService.getPartitionForDate(logTime);
    const isWarmTier = partition?.isWarmTier ?? true;
    
    // Cache the result using cache-manager (no TTL as configured in module)
    await this.cacheManager.set(partitionKey, { partition, isWarmTier });
    
    return { partition, isWarmTier };
  }

  /**
   * Clears the partition cache. Useful for testing or when partition configuration changes.
   */
  async clearPartitionCache(): Promise<void> {
    await this.cacheManager.clear();
  }

  /**
   * Maps aggregation type to PostgreSQL aggregation function
   */
  private getPostgresAggregationFunction(aggregation: string): string {
    switch (aggregation.toLowerCase()) {
      case 'sum':
        return 'SUM';
      case 'min':
        return 'MIN';
      case 'max':
        return 'MAX';
      case 'count':
        return 'COUNT';
      case 'avg':
      default:
        return 'AVG';
    }
  }

  /**
   * Maps interval to PostgreSQL date_trunc precision
   */
  private getPostgresIntervalExpression(interval: string): string {
    switch (interval.toLowerCase()) {
      case 'hour':
        return 'hour';
      case 'day':
        return 'day';
      case 'week':
        return 'week';
      case 'month':
        return 'month';
      case 'year':
        return 'year';
      default:
        return 'hour';
    }
  }

  async getMeasurement(metricId: string, logTime: Date): Promise<Measurement | null> {
    return this.measurementRepository.findOne({
      where: {
        metricId,
        logTime,
      },
    });
  }

  async getMeasurementsInRange(
    metricId: string,
    startTime: Date,
    endTime: Date,
    warmTierOnly: boolean = true,
  ): Promise<Measurement[]> {
    const where: Record<string, unknown> = {
      metricId,
      logTime: Between(startTime, endTime),
    };

    if (warmTierOnly) {
      where.isWarmTier = true;
    }

    return this.measurementRepository.find({
      where,
      order: { logTime: 'ASC' },
    });
  }
}
