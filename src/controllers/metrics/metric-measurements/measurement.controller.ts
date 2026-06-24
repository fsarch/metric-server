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

import { MeasurementService } from '../../measurements/measurement.service.js';
import { CreateMeasurementDto } from '../../../models/measurement/CreateMeasurementDto.js';
import { MeasurementDto } from '../../../models/measurement/MeasurementDto.js';
import { AggregateMeasurementsDto } from '../../../models/measurement/AggregateMeasurementsDto.js';
import { AggregatedMeasurementDto } from '../../../models/measurement/AggregatedMeasurementDto.js';
import { Role } from '../../../constants/role.enum.js';

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
  async getLatestMeasurements(
    @Param('metricId') metricId: string,
    @Query('limit') limit: number = 100,
    @Query('offset') offset: number = 0,
  ): Promise<PaginationResultDto<MeasurementDto>> {
    const measurements = await this.measurementService.getLatestMeasurementsByMetric(
      metricId,
      limit,
      true, // warmTierOnly
    );

    const result: MeasurementDto[] = measurements.map((m) => ({
      metricId: m.metricId,
      logTime: m.logTime,
      value: m.value,
      meta: m.meta,
      isWarmTier: m.isWarmTier,
    }));

    // For latest measurements, we don't have a total count from getLatestMeasurementsByMetric
    // We'll estimate based on the returned results
    const total = offset + result.length;

    return {
      data: result,
      metadata: {
        currentPage: Math.floor(offset / limit) + 1,
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
  @ApiOkResponse({ type: [AggregatedMeasurementDto] })
  async aggregateMeasurements(
    @Param('metricId') metricId: string,
    @Body() body: AggregateMeasurementsDto,
  ): Promise<AggregatedMeasurementDto[]> {
    return this.measurementService.aggregateMeasurementsByMetric(metricId, body);
  }
}
