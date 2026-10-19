import { createServiceModule } from '@fsarch/server';
import { CacheModule } from '@nestjs/cache-manager';
import { Measurement } from '../database/entities/measurement.entity.js';
import { MeasurementPartition } from '../database/entities/measurement-partition.entity.js';
import { Metric } from '../database/entities/metric.entity.js';
import { MetricType } from '../database/entities/metric-type.entity.js';
import { MeasurementController as MeasurementBulkController } from '../controllers/measurements/measurement.controller.js';
import { MeasurementService } from '../controllers/measurements/measurement.service.js';
import { MetricTypeController } from '../controllers/metric-types/metric-type.controller.js';
import { MeasurementController as MetricMeasurementController } from '../controllers/metrics/metric-measurements/measurement.controller.js';
import { MetricController } from '../controllers/metrics/metric.controller.js';
import { MetricService } from '../controllers/metrics/metric.service.js';
import { PartitionService } from '../services/partition.service.js';

// Partition cache has no TTL - partitions are static and rarely change.
const PARTITION_CACHE_TTL_MS = 0;

/**
 * The service's feature module, generated via `@fsarch/server`'s
 * `createServiceModule()` instead of the previous
 * `AppModule -> ControllersModule -> {MetricModule, MetricTypeModule,
 * MeasurementModule, MetricMeasurementsModule}` tree, each doing its own
 * unscoped `TypeOrmModule.forFeature(...)`. Flattened for the same reason
 * as `frontier-api`/`image-editor-server`: a single
 * `TypeOrmModule.forFeature(entities, connectionName)` call inside
 * `createServiceModule()` only covers providers/controllers declared
 * directly in the generated module.
 *
 * Two distinct `MeasurementController` classes exist (bulk-create under
 * `measurements/measurement.controller.ts`, per-metric
 * create+query under `metrics/metric-measurements/measurement.controller.ts`)
 * and both are imported here aliased to avoid a name collision.
 *
 * `CacheModule.register(...)` (previously wired inside `ServicesModule`,
 * alongside its own now-redundant `TypeOrmModule.forFeature([MeasurementPartition])`)
 * moves here as a plain import - it stays module-scoped (not `@Global()`),
 * so a future mono-service mount with multiple instances of this module
 * would each get their own isolated in-memory cache, same as today.
 *
 * `PartitionService`'s `partition:` config section is read via a plain
 * injected `@nestjs/config` `ConfigService`, not `@fsarch/server`'s
 * `serviceId`-aware `ModuleConfiguration`. Left as-is here (standalone
 * behavior unaffected) - same class of gap flagged for `frontend-server`'s
 * own local config loader in the mono-service POC, not addressed until a
 * real mount of this service is attempted.
 */
export const MetricServerModule = createServiceModule({
  entities: [MetricType, Metric, Measurement, MeasurementPartition],
  controllers: [
    MetricController,
    MetricTypeController,
    MeasurementBulkController,
    MetricMeasurementController,
  ],
  providers: [MetricService, MeasurementService, PartitionService],
  imports: [
    CacheModule.register({
      ttl: PARTITION_CACHE_TTL_MS,
      max: 1000,
    }),
  ],
});
