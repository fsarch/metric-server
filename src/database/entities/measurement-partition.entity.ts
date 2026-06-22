import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({
  name: 'measurement_partition',
})
export class MeasurementPartition {
  @PrimaryColumn({
    name: 'start_date',
    type: 'timestamptz',
  })
  startDate: Date;

  @PrimaryColumn({
    name: 'end_date',
    type: 'timestamptz',
  })
  endDate: Date;

  @Column({
    name: 'is_warm_tier',
    type: 'boolean',
    default: true,
  })
  isWarmTier: boolean;
}
