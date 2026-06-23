import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import { getDataType } from './utils/data-type.mapper.js';

export class BaseTables1700000000000 implements MigrationInterface {
  name = 'BaseTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const databaseType = queryRunner.connection.driver.options.type;

    // Only PostgreSQL is supported for this migration due to partitioning requirements
    if (databaseType !== 'postgres') {
      throw new Error(
        'This migration only supports PostgreSQL database. Partitioning features are PostgreSQL-specific.',
      );
    }

    // Create metric_type table with index
    await queryRunner.createTable(
      new Table({
        name: 'metric_type',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            primaryKeyConstraintName: 'pk__metric_type',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '2048',
            isNullable: false,
          },
          {
            name: 'external_id',
            type: 'varchar',
            length: '2048',
            isNullable: true,
          },
          {
            name: 'creation_time',
            type: getDataType(databaseType, 'timestamp'),
            isNullable: false,
            default: 'now()',
          },
        ],
        indices: [
          {
            name: 'idx__metric_type__external_id',
            columnNames: ['external_id'],
            isUnique: true,
            where: 'external_id IS NOT NULL',
          },
        ],
      }),
    );

    // Create metric table with indices
    await queryRunner.createTable(
      new Table({
        name: 'metric',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            primaryKeyConstraintName: 'pk__metric',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '2048',
            isNullable: false,
          },
          {
            name: 'metric_type_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'external_id',
            type: 'varchar',
            length: '2048',
            isNullable: true,
          },
          {
            name: 'creation_time',
            type: getDataType(databaseType, 'timestamp'),
            isNullable: false,
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['metric_type_id'],
            referencedTableName: 'metric_type',
            referencedColumnNames: ['id'],
            name: 'fk__metric__metric_type',
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'idx__metric__external_id',
            columnNames: ['external_id'],
            isUnique: true,
            where: 'external_id IS NOT NULL',
          },
          {
            name: 'idx__metric__metric_type_id_external_id',
            columnNames: ['metric_type_id', 'external_id'],
            isUnique: true,
            where: 'external_id IS NOT NULL',
          },
        ],
      }),
    );

    // Create measurement table as a partitioned table using raw SQL
    // This creates the table as a partitioned table by range on log_time
    await queryRunner.query(`
      CREATE TABLE measurement (
        metric_id UUID NOT NULL,
        log_time TIMESTAMPTZ NOT NULL,
        value DECIMAL(20,10) NOT NULL,
        meta JSON NULL,
        is_warm_tier BOOLEAN DEFAULT true,
        PRIMARY KEY (metric_id, log_time)
      ) PARTITION BY RANGE (log_time)
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE measurement 
      ADD CONSTRAINT fk__measurement__metric 
      FOREIGN KEY (metric_id) REFERENCES metric(id) ON DELETE CASCADE
    `);

    // Create covering index on the partitioned table template
    // This index will be inherited by all partitions
    // Note: For covering queries on warm tier data
    await queryRunner.query(`
      CREATE INDEX idx__measurement__covering_warm
      ON measurement (metric_id, log_time)
      INCLUDE (value, meta)
      WHERE is_warm_tier = true
    `);

    // Create measurement_partition table with index
    await queryRunner.createTable(
      new Table({
        name: 'measurement_partition',
        columns: [
          {
            name: 'start_date',
            type: getDataType(databaseType, 'timestamp'),
            isPrimary: true,
          },
          {
            name: 'end_date',
            type: getDataType(databaseType, 'timestamp'),
            isPrimary: true,
          },
          {
            name: 'is_warm_tier',
            type: getDataType(databaseType, 'boolean'),
            default: true,
          },
        ],
        indices: [
          {
            name: 'idx__measurement_partition__start_date_end_date',
            columnNames: ['start_date', 'end_date'],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const databaseType = queryRunner.connection.driver.options.type;

    // Only PostgreSQL is supported for this migration due to partitioning requirements
    if (databaseType !== 'postgres') {
      throw new Error(
        'This migration only supports PostgreSQL database. Partitioning features are PostgreSQL-specific.',
      );
    }

    await queryRunner.dropTable('measurement_partition');

    // For partitioned tables, we need to drop all partitions first
    // Get all partitions
    const partitions = await queryRunner.query(`
      SELECT relname FROM pg_class 
      WHERE relname LIKE 'measurement_%' AND relkind = 'r'
    `);

    // Drop all partitions
    for (const partition of partitions) {
      await queryRunner.query(`
        DROP TABLE IF EXISTS ${partition.relname} CASCADE
      `);
    }

    await queryRunner.dropTable('measurement');
    await queryRunner.dropTable('metric');
    await queryRunner.dropTable('metric_type');
  }
}
