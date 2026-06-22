import {
  Controller,
  Post,
  UseGuards,
  Body,
  Param,
  NotFoundException,
  Get,
  Query,
} from '@nestjs/common';

import { AuthGuard } from '@fsarch/server/auth';
import { Roles } from '@fsarch/server/uac';
import { PaginationResultDto, ApiOkPaginatedResponse } from '@fsarch/server/pagination';

import { MeasurementService } from './measurement.service.js';
import { CreateMeasurementDto } from '../../models/measurement/CreateMeasurementDto.js';
import { MeasurementDto } from '../../models/measurement/MeasurementDto.js';
import { QueryMeasurementsDto } from '../../models/measurement/QueryMeasurementsDto.js';
import { Role } from '../../constants/role.enum.js';

@Controller('measurements')
export class MeasurementController {
  constructor(private readonly measurementService: MeasurementService) {}

  @Post()
  @UseGuards(AuthGuard)
  @Roles(Role.write_measurements)
  async createMeasurement(
    @Body() body: CreateMeasurementDto,
  ): Promise<MeasurementDto> {
    const measurement = await this.measurementService.createMeasurement(body);

    return {
      metricId: measurement.metricId,
      logTime: measurement.logTime,
      value: measurement.value,
      meta: measurement.meta,
      isWarmTier: measurement.isWarmTier,
    };
  }

  @Post('bulk')
  @UseGuards(AuthGuard)
  @Roles(Role.write_measurements)
  async createMeasurementsBulk(
    @Body() bodies: CreateMeasurementDto[],
  ): Promise<MeasurementDto[]> {
    const measurements = await this.measurementService.createMeasurements(bodies);

    return measurements.map((m) => ({
      metricId: m.metricId,
      logTime: m.logTime,
      value: m.value,
      meta: m.meta,
      isWarmTier: m.isWarmTier,
    }));
  }

  @Get()
  @UseGuards(AuthGuard)
  @Roles(Role.read_metrics)
  @ApiOkPaginatedResponse(MeasurementDto)
  async queryMeasurements(
    @Query() query: QueryMeasurementsDto,
  ): Promise<PaginationResultDto<MeasurementDto>> {
    const { data, total } = await this.measurementService.queryMeasurements(query);

    const result: MeasurementDto[] = data.map((m) => ({
      metricId: m.metricId,
      logTime: m.logTime,
      value: m.value,
      meta: m.meta,
      isWarmTier: m.isWarmTier,
    }));

    return {
      data: result,
      metadata: {
        currentPage: 1,
        totalPages: 1,
        pageSize: result.length,
        totalItems: total,
      },
    };
  }

  @Get('/:metricId/latest')
  @UseGuards(AuthGuard)
  @Roles(Role.read_metrics)
  async getLatestMeasurements(
    @Param('metricId') metricId: string,
    @Query('limit') limit: number = 100,
  ): Promise<MeasurementDto[]> {
    const measurements = await this.measurementService.getLatestMeasurements(
      metricId,
      limit,
    );

    return measurements.map((m) => ({
      metricId: m.metricId,
      logTime: m.logTime,
      value: m.value,
      meta: m.meta,
      isWarmTier: m.isWarmTier,
    }));
  }

  @Get('/:metricId/aggregate')
  @UseGuards(AuthGuard)
  @Roles(Role.read_metrics)
  async aggregateMeasurements(
    @Param('metricId') metricId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('interval') interval: 'hour' | 'day' | 'week' | 'month' = 'hour',
    @Query('aggregation') aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count' = 'avg',
  ): Promise<Record<string, number>> {
    if (!startTime || !endTime) {
      throw new NotFoundException('startTime and endTime are required');
    }

    return this.measurementService.aggregateMeasurements(
      metricId,
      new Date(startTime),
      new Date(endTime),
      interval,
      aggregation,
    );
  }
}
