import { MetricType } from './entities/metric-type.entity.js';
import { Metric } from './entities/metric.entity.js';
import { Measurement } from './entities/measurement.entity.js';
import { MeasurementPartition } from './entities/measurement-partition.entity.js';
import { BaseTables1700000000000 } from './migrations/1700000000000-base-tables.js';

export const DATABASE_OPTIONS = {
  entities: [MetricType, Metric, Measurement, MeasurementPartition],
  migrations: [BaseTables1700000000000],
};

export { MetricType, Metric, Measurement, MeasurementPartition };
