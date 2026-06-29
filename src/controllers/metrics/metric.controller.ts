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
  ParseBoolPipe, DefaultValuePipe,
} from '@nestjs/common';

import { AuthGuard } from '@fsarch/server/auth';
import { Roles } from '@fsarch/server/uac';
import { PaginationResultDto, ApiOkPaginatedResponse } from '@fsarch/server/pagination';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOkResponse, ApiQuery } from '@nestjs/swagger';

import { MetricService } from './metric.service.js';
import { CreateMetricDto } from '../../models/metric/CreateMetricDto.js';
import { MetricDto } from '../../models/metric/MetricDto.js';
import { MetricStatusDto } from '../../models/metric/MetricStatusDto.js';
import { Role } from '../../constants/role.enum.js';

@ApiBearerAuth()
@Controller('metrics')
export class MetricController {
  constructor(private readonly metricService: MetricService) {}

  @Post()
  @UseGuards(AuthGuard)
  @Roles(Role.manage_metrics)
  @ApiBody({ type: CreateMetricDto })
  @ApiCreatedResponse({ type: MetricDto })
  async createMetric(@Body() body: CreateMetricDto): Promise<MetricDto> {
    const metric = await this.metricService.createMetric(body);

    return {
      id: metric.id,
      name: metric.name,
      metricTypeId: metric.metricTypeId,
      externalId: metric.externalId,
      creationTime: metric.creationTime,
      deletionTime: metric.deletionTime,
    };
  }

  @Get()
  @UseGuards(AuthGuard)
  @Roles(Role.read_metrics)
  @ApiOkPaginatedResponse(MetricDto)
  @ApiQuery({ name: 'metricTypeId', required: false })
  @ApiQuery({ name: 'isDeleted', required: false, type: Boolean })
  async listMetrics(
    @Query('metricTypeId') metricTypeId?: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 25,
    @Query('isDeleted', new DefaultValuePipe(false), ParseBoolPipe) isDeleted?: boolean,
  ): Promise<PaginationResultDto<MetricDto>> {
    const skip = (page - 1) * pageSize;
    const [metrics, total] = await Promise.all([
      this.metricService.listMetrics(metricTypeId, skip, pageSize, isDeleted),
      this.metricService.countMetrics(metricTypeId, isDeleted),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    const data: MetricDto[] = metrics.map((m) => ({
      id: m.id,
      name: m.name,
      metricTypeId: m.metricTypeId,
      externalId: m.externalId,
      creationTime: m.creationTime,
      deletionTime: m.deletionTime,
    }));

    return {
      data,
      metadata: {
        currentPage: page,
        totalPages,
        pageSize,
        totalItems: total,
      },
    };
  }

  @Get('/:id')
  @UseGuards(AuthGuard)
  @Roles(Role.read_metrics)
  @ApiOkResponse({ type: MetricDto })
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
      deletionTime: metric.deletionTime,
    };
  }

  @Delete('/:id')
  @UseGuards(AuthGuard)
  @Roles(Role.manage_metrics)
  async deleteMetric(@Param('id') id: string): Promise<void> {
    await this.metricService.deleteMetric(id);
  }

  @Post('/:id/_actions/restore')
  @UseGuards(AuthGuard)
  @Roles(Role.manage_metrics)
  async restoreMetric(@Param('id') id: string): Promise<void> {
    await this.metricService.restoreMetric(id);
  }

  @Get('/:id/status')
  @UseGuards(AuthGuard)
  @Roles(Role.read_metrics)
  @ApiOkResponse({ type: MetricStatusDto })
  async getMetricStatus(@Param('id') id: string): Promise<MetricStatusDto> {
    return this.metricService.getMetricStatus(id);
  }
}
