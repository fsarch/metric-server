import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Metric } from './metric.entity.js';

@Entity({
  name: 'measurement',
})
export class Measurement {
  @PrimaryColumn({
    name: 'metric_id',
    type: 'uuid',
  })
  metricId: string;

  @PrimaryColumn({
    name: 'log_time',
    type: 'timestamptz',
  })
  logTime: Date;

  @ManyToOne(() => Metric, (metric) => metric.id)
  @JoinColumn({ name: 'metric_id' })
  metric: Metric;

  @Column({
    name: 'value',
    type: 'decimal',
    precision: 20,
    scale: 10,
    nullable: false,
  })
  value: number;

  @Column({
    name: 'meta',
    type: 'json',
    nullable: true,
    default: null,
  })
  meta: Record<string, unknown> | null;

  @Column({
    name: 'is_warm_tier',
    type: 'boolean',
    default: true,
  })
  isWarmTier: boolean;
}
