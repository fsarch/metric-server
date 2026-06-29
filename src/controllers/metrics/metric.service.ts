import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Not, IsNull, Repository } from 'typeorm';
import { MetricType } from '../../database/entities/metric-type.entity.js';
import { Metric } from '../../database/entities/metric.entity.js';
import { Measurement } from '../../database/entities/measurement.entity.js';
import { CreateMetricTypeDto } from '../../models/metric/CreateMetricTypeDto.js';
import { CreateMetricDto } from '../../models/metric/CreateMetricDto.js';
import { MetricStatusDto } from '../../models/metric/MetricStatusDto.js';
import crypto from 'node:crypto';
import { type HardDeleteContext, OnHardDelete } from "@fsarch/server/deletion";

@Injectable()
export class MetricService {
  private readonly logger = new Logger(MetricService.name);

  constructor(
    @InjectRepository(MetricType)
    private readonly metricTypeRepository: Repository<MetricType>,
    @InjectRepository(Metric)
    private readonly metricRepository: Repository<Metric>,
    @InjectRepository(Measurement)
    private readonly measurementRepository: Repository<Measurement>,
  ) {}

  // Metric Type Methods

  async createMetricType(dto: CreateMetricTypeDto): Promise<MetricType> {
    const id = crypto.randomUUID();

    // Check if externalId already exists
    if (dto.externalId) {
      const existing = await this.metricTypeRepository.findOne({
        where: { externalId: dto.externalId },
      });
      if (existing) {
        throw new ConflictException(
          `Metric type with externalId ${dto.externalId} already exists`,
        );
      }
    }

    const metricType = this.metricTypeRepository.create({
      id,
      name: dto.name,
      externalId: dto.externalId ?? null,
    });

    return this.metricTypeRepository.save(metricType);
  }

  async listMetricTypes(): Promise<MetricType[]> {
    return this.metricTypeRepository.find({
      order: { name: 'ASC' },
    });
  }

  async getMetricType(id: string): Promise<MetricType> {
    const metricType = await this.metricTypeRepository.findOne({
      where: { id },
    });

    if (!metricType) {
      throw new NotFoundException(`Metric type with id ${id} not found`);
    }

    return metricType;
  }

  async getMetricTypeByExternalId(externalId: string): Promise<MetricType> {
    const metricType = await this.metricTypeRepository.findOne({
      where: { externalId },
    });

    if (!metricType) {
      throw new NotFoundException(
        `Metric type with externalId ${externalId} not found`,
      );
    }

    return metricType;
  }

  async deleteMetricType(id: string): Promise<void> {
    const result = await this.metricTypeRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Metric type with id ${id} not found`);
    }
  }

  // Metric Methods

  async createMetric(dto: CreateMetricDto): Promise<Metric> {
    const id = crypto.randomUUID();

    // Validate metric type exists
    const metricType = await this.metricTypeRepository.findOne({
      where: { id: dto.metricTypeId },
    });

    if (!metricType) {
      throw new NotFoundException(
        `Metric type with id ${dto.metricTypeId} not found`,
      );
    }

    // Check if externalId already exists for this metric type (excluding deleted)
    if (dto.externalId) {
      const existing = await this.metricRepository.findOne({
        where: {
          metricTypeId: dto.metricTypeId,
          externalId: dto.externalId,
          deletionTime: IsNull(),
        },
      });
      if (existing) {
        throw new ConflictException(
          `Metric with externalId ${dto.externalId} already exists for this metric type`,
        );
      }
    }

    const metric = this.metricRepository.create({
      id,
      name: dto.name,
      metricTypeId: dto.metricTypeId,
      externalId: dto.externalId ?? null,
    });

    return this.metricRepository.save(metric);
  }

  async listMetrics(
    metricTypeId?: string,
    skip?: number,
    take?: number,
    isDeleted?: boolean,
  ): Promise<Metric[]> {
    const query: Record<string, unknown> = {};

    if (metricTypeId) {
      query.metricTypeId = metricTypeId;
    }

    // isDeleted=true means we want only deleted metrics
    if (isDeleted) {
      query.deletionTime = Not(IsNull());
    } else {
      // Default: only non-deleted metrics
      query.deletionTime = IsNull();
    }

    return this.metricRepository.find({
      where: query,
      relations: { metricType: true },
      order: { name: 'ASC' },
      skip,
      take,
    });
  }

  async countMetrics(metricTypeId?: string, isDeleted?: boolean): Promise<number> {
    const query: Record<string, unknown> = {};

    if (metricTypeId) {
      query.metricTypeId = metricTypeId;
    }

    // isDeleted=true means we want only deleted metrics
    if (isDeleted) {
      query.deletionTime = Not(IsNull());
    } else {
      // Default: only non-deleted metrics
      query.deletionTime = IsNull();
    }

    return this.metricRepository.count({ where: query });
  }

  async getMetric(id: string): Promise<Metric> {
    const metric = await this.metricRepository.findOne({
      where: { id, deletionTime: IsNull() },
      relations: { metricType: true },
    });

    if (!metric) {
      throw new NotFoundException(`Metric with id ${id} not found`);
    }

    return metric;
  }

  async getMetricByExternalId(externalId: string): Promise<Metric> {
    const metric = await this.metricRepository.findOne({
      where: { externalId, deletionTime: IsNull() },
      relations: { metricType: true },
    });

    if (!metric) {
      throw new NotFoundException(`Metric with externalId ${externalId} not found`);
    }

    return metric;
  }

  async deleteMetric(id: string): Promise<void> {
    const metric = await this.metricRepository.findOne({ where: { id } });

    if (!metric) {
      throw new NotFoundException(`Metric with id ${id} not found`);
    }

    if (metric.deletionTime) {
      throw new ConflictException(`Metric with id ${id} is already deleted`);
    }

    await this.metricRepository.update(id, { deletionTime: new Date() });
  }

  async restoreMetric(id: string): Promise<void> {
    const metric = await this.metricRepository.findOne({ where: { id } });

    if (!metric) {
      throw new NotFoundException(`Metric with id ${id} not found`);
    }

    if (!metric.deletionTime) {
      throw new ConflictException(`Metric with id ${id} is not deleted`);
    }

    await this.metricRepository.update(id, {
      deletionTime: null,
    });
  }

  async getMetricStatus(metricId: string): Promise<MetricStatusDto> {
    // Get total count of measurements for this metric
    const totalMeasurements = await this.measurementRepository.count({
      where: { metricId },
    });

    // Get first and last measurement dates
    const result = await this.measurementRepository
      .createQueryBuilder('m')
      .select(['MIN(m.log_time) as first', 'MAX(m.log_time) as last'])
      .where('m.metric_id = :metricId', { metricId })
      .getRawOne();

    return {
      totalMeasurements,
      firstMeasurementAt: result?.first ? new Date(result.first) : null,
      lastMeasurementAt: result?.last ? new Date(result.last) : null,
    };
  }

  @OnHardDelete('metric')
  async onHardDelete(ctx: HardDeleteContext) {
    const { cutOffDate } = ctx;
    console.log('cutOffDate', cutOffDate);

    await this.metricRepository.delete({
      deletionTime: LessThan(cutOffDate),
    })
  }
}
