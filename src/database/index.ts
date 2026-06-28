import { MetricType } from './entities/metric-type.entity.js';
import { Metric } from './entities/metric.entity.js';
import { Measurement } from './entities/measurement.entity.js';
import { MeasurementPartition } from './entities/measurement-partition.entity.js';
import { BaseTables1700000000000 } from './migrations/1700000000000-base-tables.js';
import { AddDeletionTimeToMetric1782679583570 } from "./migrations/1782679583570-add-deletion-time-to-metric.js";

export const DATABASE_OPTIONS = {
  entities: [MetricType, Metric, Measurement, MeasurementPartition],
  migrations: [BaseTables1700000000000, AddDeletionTimeToMetric1782679583570],
};

export { MetricType, Metric, Measurement, MeasurementPartition };
