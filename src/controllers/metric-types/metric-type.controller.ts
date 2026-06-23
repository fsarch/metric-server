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

import { MetricService } from '../metrics/metric.service.js';
import { CreateMetricTypeDto } from '../../models/metric/CreateMetricTypeDto.js';
import { MetricTypeDto } from '../../models/metric/MetricTypeDto.js';
import { Role } from '../../constants/role.enum.js';

@ApiBearerAuth()
@Controller('metric-types')
export class MetricTypeController {
  constructor(private readonly metricService: MetricService) {}

  @Post()
  @UseGuards(AuthGuard)
  @Roles(Role.manage_metrics)
  @ApiBody({ type: CreateMetricTypeDto })
  @ApiCreatedResponse({ type: MetricTypeDto })
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
  @ApiOkResponse({ type: MetricTypeDto })
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
