import { AuthGuard } from '@fsarch/server/auth';
import { Roles } from '@fsarch/server/uac';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse } from '@nestjs/swagger';
import { Role } from '../../constants/role.enum.js';
import { CreateMeasurementDto } from '../../models/measurement/CreateMeasurementDto.js';
import { MeasurementDto } from '../../models/measurement/MeasurementDto.js';
import { MeasurementService } from './measurement.service.js';

@ApiBearerAuth()
@Controller('measurements')
export class MeasurementController {
  constructor(private readonly measurementService: MeasurementService) {}

  @Post('_actions/bulk')
  @UseGuards(AuthGuard)
  @Roles(Role.write_measurements)
  @ApiBody({ type: [CreateMeasurementDto] })
  @ApiCreatedResponse({
    type: Array<{ metricId: string; logTime: Date }>,
    description: 'Returns metricId and logTime for each created measurement',
  })
  async createMeasurementsBulk(
    @Body() bodies: CreateMeasurementDto[],
  ): Promise<Array<{ metricId: string; logTime: Date }>> {
    const measurements =
      await this.measurementService.createMeasurements(bodies);

    return measurements.map((m) => ({
      metricId: m.metricId,
      logTime: m.logTime,
    }));
  }
}
