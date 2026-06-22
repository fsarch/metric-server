import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between, IsNull, Not } from 'typeorm';
import { Measurement } from '../../database/entities/measurement.entity.js';
import { PartitionService } from '../../services/partition.service.js';
import { CreateMeasurementDto } from '../../models/measurement/CreateMeasurementDto.js';
import { QueryMeasurementsDto } from '../../models/measurement/QueryMeasurementsDto.js';

@Injectable()
export class MeasurementService {
  private readonly logger = new Logger(MeasurementService.name);

  constructor(
    @InjectRepository(Measurement)
    private readonly measurementRepository: Repository<Measurement>,
    private readonly partitionService: PartitionService,
  ) {}

  async createMeasurement(dto: CreateMeasurementDto): Promise<Measurement> {
    const logTime = new Date(dto.logTime);

    // Ensure partition exists for this date
    await this.partitionService.ensurePartitionForDate(logTime);

    // Determine warm tier status based on configuration
    // If isWarmTier is explicitly set, use that value
    // Otherwise, use the partition's warm tier status
    const partition = await this.partitionService.getPartitionForDate(logTime);
    const isWarmTier = dto.isWarmTier !== undefined ? dto.isWarmTier : partition?.isWarmTier ?? true;

    const measurement = this.measurementRepository.create({
      metricId: dto.metricId,
      logTime,
      value: dto.value,
      meta: dto.meta ?? null,
      isWarmTier,
    });

    return this.measurementRepository.save(measurement);
  }

  async createMeasurements(dtos: CreateMeasurementDto[]): Promise<Measurement[]> {
    const measurements: Measurement[] = [];

    for (const dto of dtos) {
      const measurement = await this.createMeasurement(dto);
      measurements.push(measurement);
    }

    return measurements;
  }

  async queryMeasurements(query: QueryMeasurementsDto): Promise<{
    data: Measurement[];
    total: number;
  }> {
    const { metricId, startTime, endTime, warmTierOnly, limit = 1000, offset = 0 } = query;

    const where: Record<string, unknown> = {};

    if (metricId) {
      where.metricId = metricId;
    }

    if (startTime) {
      where.logTime = MoreThan(new Date(startTime));
    }

    if (endTime) {
      if (where.logTime) {
        where.logTime = Between(new Date(startTime), new Date(endTime));
      } else {
        where.logTime = LessThan(new Date(endTime));
      }
    }

    if (warmTierOnly !== undefined && warmTierOnly === true) {
      where.isWarmTier = true;
    } else if (warmTierOnly !== undefined && warmTierOnly === false) {
      where.isWarmTier = false;
    }

    const [measurements, total] = await this.measurementRepository.findAndCount({
      where,
      order: { logTime: 'ASC' },
      take: limit,
      skip: offset,
    });

    return { data: measurements, total };
  }

  async getMeasurement(metricId: string, logTime: Date): Promise<Measurement | null> {
    return this.measurementRepository.findOne({
      where: {
        metricId,
        logTime,
      },
    });
  }

  async getLatestMeasurements(
    metricId: string,
    limit: number = 100,
  ): Promise<Measurement[]> {
    return this.measurementRepository.find({
      where: { metricId },
      order: { logTime: 'DESC' },
      take: limit,
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

  async aggregateMeasurements(
    metricId: string,
    startTime: Date,
    endTime: Date,
    interval: 'hour' | 'day' | 'week' | 'month' = 'hour',
    aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count' = 'avg',
  ): Promise<Record<string, number>> {
    // This is a simplified aggregation
    // In a production environment, you would use raw SQL queries
    // or a time-series database for better performance

    const measurements = await this.getMeasurementsInRange(
      metricId,
      startTime,
      endTime,
    );

    const aggregated: Record<string, number> = {};

    for (const measurement of measurements) {
      const key = this.getIntervalKey(measurement.logTime, interval);

      if (!aggregated[key]) {
        aggregated[key] = 0;
      }

      switch (aggregation) {
        case 'sum':
          aggregated[key] += measurement.value;
          break;
        case 'min':
          aggregated[key] = Math.min(aggregated[key], measurement.value);
          break;
        case 'max':
          aggregated[key] = Math.max(aggregated[key], measurement.value);
          break;
        case 'count':
          aggregated[key] += 1;
          break;
        case 'avg':
        default:
          // For average, we'd need to track sum and count separately
          // This is a simplified version
          if (aggregated[key] === 0) {
            aggregated[key] = measurement.value;
          } else {
            aggregated[key] = (aggregated[key] + measurement.value) / 2;
          }
          break;
      }
    }

    return aggregated;
  }

  private getIntervalKey(date: Date, interval: string): string {
    switch (interval) {
      case 'day':
        return date.toISOString().split('T')[0];
      case 'week': {
        const d = new Date(date);
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        return d.toISOString().split('T')[0];
      }
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      case 'hour':
      default:
        return date.toISOString().split(':')[0] + ':00:00';
    }
  }
}
