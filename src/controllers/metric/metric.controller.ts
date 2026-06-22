import {
  Controller,
  Post,
  UseGuards,
  Body,
  Param,
  NotFoundException,
  Get,
  Query,
  Delete,
} from '@nestjs/common';

import { AuthGuard } from '@fsarch/server/auth';
import { Roles } from '@fsarch/server/uac';
import { PaginationResultDto, ApiOkPaginatedResponse } from '@fsarch/server/pagination';

import { MetricService } from './metric.service.js';
import { CreateMetricTypeDto } from '../../models/metric/CreateMetricTypeDto.js';
import { CreateMetricDto } from '../../models/metric/CreateMetricDto.js';
import { MetricTypeDto } from '../../models/metric/MetricTypeDto.js';
import { MetricDto } from '../../models/metric/MetricDto.js';
import { Role } from '../../constants/role.enum.js';

@Controller('metric-types')
export class MetricTypeController {
  constructor(private readonly metricService: MetricService) {}

  @Post()
  @UseGuards(AuthGuard)
  @Roles(Role.manage_metrics)
  async createMetricType(@Body() body: CreateMetricTypeDto): Promise<MetricTypeDto> {
    const metricType = await this.metricService.createMetricType(body);

    return {
      id: metricType.id,
      name: metricType.name,
      externalId: metricType.externalId,
      creationTime: metricType.creationTime,
    };
  }

  @Get()
  @UseGuards(AuthGuard)
  @Roles(Role.read_metrics)
  @ApiOkPaginatedResponse(MetricTypeDto)
  async listMetricTypes(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 25,
  ): Promise<PaginationResultDto<MetricTypeDto>> {
    const skip = (page - 1) * pageSize;
    const [metricTypes, totalItems] = await Promise.all([
      this.metricService.listMetricTypes(),
      this.metricService.listMetricTypes(),
    ]);

    const totalPages = Math.ceil(totalItems.length / pageSize);
    const paginatedMetricTypes = metricTypes.slice(skip, skip + pageSize);

    const data: MetricTypeDto[] = paginatedMetricTypes.map((mt) => ({
      id: mt.id,
      name: mt.name,
      externalId: mt.externalId,
      creationTime: mt.creationTime,
    }));

    return {
      data,
      metadata: {
        currentPage: page,
        totalPages,
        pageSize,
        totalItems: totalItems.length,
      },
    };
  }

  @Get('/:id')
  @UseGuards(AuthGuard)
  @Roles(Role.read_metrics)
  async getMetricType(@Param('id') id: string): Promise<MetricTypeDto> {
    const metricType = await this.metricService.getMetricType(id);

    if (!metricType) {
      throw new NotFoundException();
    }

    return {
      id: metricType.id,
      name: metricType.name,
      externalId: metricType.externalId,
      creationTime: metricType.creationTime,
    };
  }

  @Delete('/:id')
  @UseGuards(AuthGuard)
  @Roles(Role.manage_metrics)
  async deleteMetricType(@Param('id') id: string): Promise<void> {
    await this.metricService.deleteMetricType(id);
  }
}

@Controller('metrics')
export class MetricController {
  constructor(private readonly metricService: MetricService) {}

  @Post()
  @UseGuards(AuthGuard)
  @Roles(Role.manage_metrics)
  async createMetric(@Body() body: CreateMetricDto): Promise<MetricDto> {
    const metric = await this.metricService.createMetric(body);

    return {
      id: metric.id,
      name: metric.name,
      metricTypeId: metric.metricTypeId,
      externalId: metric.externalId,
      creationTime: metric.creationTime,
    };
  }

  @Get()
  @UseGuards(AuthGuard)
  @Roles(Role.read_metrics)
  @ApiOkPaginatedResponse(MetricDto)
  async listMetrics(
    @Query('metricTypeId') metricTypeId: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 25,
  ): Promise<PaginationResultDto<MetricDto>> {
    const skip = (page - 1) * pageSize;
    const [metrics, totalItems] = await Promise.all([
      this.metricService.listMetrics(metricTypeId),
      this.metricService.listMetrics(metricTypeId),
    ]);

    const totalPages = Math.ceil(totalItems.length / pageSize);
    const paginatedMetrics = metrics.slice(skip, skip + pageSize);

    const data: MetricDto[] = paginatedMetrics.map((m) => ({
      id: m.id,
      name: m.name,
      metricTypeId: m.metricTypeId,
      externalId: m.externalId,
      creationTime: m.creationTime,
    }));

    return {
      data,
      metadata: {
        currentPage: page,
        totalPages,
        pageSize,
        totalItems: totalItems.length,
      },
    };
  }

  @Get('/:id')
  @UseGuards(AuthGuard)
  @Roles(Role.read_metrics)
  async getMetric(@Param('id') id: string): Promise<MetricDto> {
    const metric = await this.metricService.getMetric(id);

    if (!metric) {
      throw new NotFoundException();
    }

    return {
      id: metric.id,
      name: metric.name,
      metricTypeId: metric.metricTypeId,
      externalId: metric.externalId,
      creationTime: metric.creationTime,
    };
  }

  @Delete('/:id')
  @UseGuards(AuthGuard)
  @Roles(Role.manage_metrics)
  async deleteMetric(@Param('id') id: string): Promise<void> {
    await this.metricService.deleteMetric(id);
  }
}
