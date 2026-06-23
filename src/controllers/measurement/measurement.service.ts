import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between } from 'typeorm';
import { Measurement } from '../../database/entities/measurement.entity.js';
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
  ) {}

  async createMeasurement(
    metricId: string,
    dto: Omit<CreateMeasurementDto, 'metricId'>,
  ): Promise<Measurement> {
    const logTime = new Date(dto.logTime);

    // Ensure partition exists for this date
    await this.partitionService.ensurePartitionForDate(logTime);

    // Determine warm tier status based on configuration
    const partition = await this.partitionService.getPartitionForDate(logTime);
    const isWarmTier = dto.isWarmTier !== undefined ? dto.isWarmTier : partition?.isWarmTier ?? true;

    const measurement = this.measurementRepository.create({
      metricId,
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
      const measurement = await this.createMeasurement(dto.metricId, dto);
      measurements.push(measurement);
    }

    return measurements;
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
  ): Promise<Record<string, number>> {
    const { startTime, endTime, interval, aggregation, warmTierOnly } = dto;

    const measurements = await this.getMeasurementsInRange(
      metricId,
      new Date(startTime),
      new Date(endTime),
      warmTierOnly,
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
