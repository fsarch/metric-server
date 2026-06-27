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
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';

import { MetricService } from './metric.service.js';
import { CreateMetricDto } from '../../models/metric/CreateMetricDto.js';
import { MetricDto } from '../../models/metric/MetricDto.js';
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
    };
  }

  @Get()
  @UseGuards(AuthGuard)
  @Roles(Role.read_metrics)
  @ApiOkPaginatedResponse(MetricDto)
  async listMetrics(
    @Query('metricTypeId') metricTypeId?: string,
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
    };
  }

  @Delete('/:id')
  @UseGuards(AuthGuard)
  @Roles(Role.manage_metrics)
  async deleteMetric(@Param('id') id: string): Promise<void> {
    await this.metricService.deleteMetric(id);
  }
}
