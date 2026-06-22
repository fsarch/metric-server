import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({
  name: 'metric_type',
})
export class MetricType {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'pk__metric_type',
  })
  id: string;

  @Column({
    name: 'name',
    length: 2048,
    nullable: false,
  })
  name: string;

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
