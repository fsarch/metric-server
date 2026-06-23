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
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';

import { MeasurementService } from './measurement.service.js';
import { CreateMeasurementDto } from '../../models/measurement/CreateMeasurementDto.js';
import { MeasurementDto } from '../../models/measurement/MeasurementDto.js';
import { AggregateMeasurementsDto } from '../../models/measurement/AggregateMeasurementsDto.js';
import { Role } from '../../constants/role.enum.js';

@ApiBearerAuth()
@Controller('metrics/:metricId/measurements')
export class MeasurementController {
  constructor(private readonly measurementService: MeasurementService) {}

  @Post()
  @UseGuards(AuthGuard)
  @Roles(Role.write_measurements)
  @ApiBody({ type: CreateMeasurementDto })
  @ApiCreatedResponse({ type: MeasurementDto })
  async createMeasurement(
    @Param('metricId') metricId: string,
    @Body() body: Omit<CreateMeasurementDto, 'metricId'>,
  ): Promise<MeasurementDto> {
    const measurement = await this.measurementService.createMeasurement(metricId, body);

    return {
      metricId: measurement.metricId,
      logTime: measurement.logTime,
      value: measurement.value,
      meta: measurement.meta,
      isWarmTier: measurement.isWarmTier,
    };
  }

  @Get()
  @UseGuards(AuthGuard)
  @Roles(Role.read_metrics)
  @ApiOkPaginatedResponse(MeasurementDto)
  async queryMeasurementsByMetric(
    @Param('metricId') metricId: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('limit') limit: number = 1000,
    @Query('offset') offset: number = 0,
  ): Promise<PaginationResultDto<MeasurementDto>> {
    const { data, total } = await this.measurementService.queryMeasurementsByMetric(
      metricId,
      startTime ? new Date(startTime) : undefined,
      endTime ? new Date(endTime) : undefined,
      limit,
      offset,
    );

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
        totalPages: Math.ceil(total / limit),
        pageSize: result.length,
        totalItems: total,
      },
    };
  }

  @Post('_actions/aggregate')
  @UseGuards(AuthGuard)
  @Roles(Role.read_metrics)
  @ApiBody({ type: AggregateMeasurementsDto })
  @ApiOkResponse({ type: Object })
  async aggregateMeasurements(
    @Param('metricId') metricId: string,
    @Body() body: AggregateMeasurementsDto,
  ): Promise<Record<string, number>> {
    return this.measurementService.aggregateMeasurementsByMetric(metricId, body);
  }
}

@ApiBearerAuth()
@Controller('measurements')
export class BulkMeasurementController {
  constructor(private readonly measurementService: MeasurementService) {}

  @Post('_actions/bulk')
  @UseGuards(AuthGuard)
  @Roles(Role.write_measurements)
  @ApiBody({ type: [CreateMeasurementDto] })
  @ApiCreatedResponse({ type: [MeasurementDto] })
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
}
