import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MetricType } from './metric-type.entity.js';

@Entity({
  name: 'metric',
})
export class Metric {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'pk__metric',
  })
  id: string;

  @Column({
    name: 'name',
    length: 2048,
    nullable: false,
  })
  name: string;

  @Column({
    name: 'metric_type_id',
    type: 'uuid',
    nullable: false,
  })
  metricTypeId: string;

  @ManyToOne(() => MetricType, (metricType) => metricType.id)
  @JoinColumn({ name: 'metric_type_id' })
  metricType: MetricType;

  @Column({
    name: 'external_id',
    length: 2048,
    nullable: true,
  })
  externalId: string | null;

  @CreateDateColumn({
    name: 'creation_time',
    type: 'timestamptz',
  })
  creationTime: Date;
}
