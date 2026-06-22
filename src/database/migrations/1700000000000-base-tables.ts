import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';
import { getDataType } from './utils/data-type.mapper.js';

export class BaseTables1700000000000 implements MigrationInterface {
  name = 'BaseTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const databaseType = queryRunner.connection.driver.options.type;

    // Create metric_type table
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
      }),
    );

    // Create metric table
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
      }),
    );

    // Create measurement table with partitioning
    await queryRunner.createTable(
      new Table({
        name: 'measurement',
        columns: [
          {
            name: 'metric_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'log_time',
            type: getDataType(databaseType, 'timestamp'),
            isPrimary: true,
          },
          {
            name: 'value',
            type: getDataType(databaseType, 'decimal'),
            precision: '20',
            scale: '10',
            isNullable: false,
          },
          {
            name: 'meta',
            type: 'json',
            isNullable: true,
            default: null,
          },
          {
            name: 'is_warm_tier',
            type: getDataType(databaseType, 'boolean'),
            default: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['metric_id'],
            referencedTableName: 'metric',
            referencedColumnNames: ['id'],
            name: 'fk__measurement__metric',
            onDelete: 'CASCADE',
          },
        ],
      }),
    );

    // Create measurement_partition table
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
      }),
    );

    // Create index on measurement for warm tier data
    await queryRunner.createIndex(
      new TableIndex({
        name: 'idx__measurement__metric_id_log_time_warm_tier',
        tableName: 'measurement',
        columnNames: ['metric_id', 'log_time'],
        where: 'is_warm_tier = true',
      }),
    );

    // Create index on metric_type external_id
    await queryRunner.createIndex(
      new TableIndex({
        name: 'idx__metric_type__external_id',
        tableName: 'metric_type',
        columnNames: ['external_id'],
        isUnique: true,
        where: 'external_id IS NOT NULL',
      }),
    );

    // Create index on metric external_id
    await queryRunner.createIndex(
      new TableIndex({
        name: 'idx__metric__external_id',
        tableName: 'metric',
        columnNames: ['external_id'],
        isUnique: true,
        where: 'external_id IS NOT NULL',
      }),
    );

    // Create index on metric type_id and external_id
    await queryRunner.createIndex(
      new TableIndex({
        name: 'idx__metric__metric_type_id_external_id',
        tableName: 'metric',
        columnNames: ['metric_type_id', 'external_id'],
        isUnique: true,
        where: 'external_id IS NOT NULL',
      }),
    );

    // Create index on measurement_partition for range queries
    await queryRunner.createIndex(
      new TableIndex({
        name: 'idx__measurement_partition__start_date_end_date',
        tableName: 'measurement_partition',
        columnNames: ['start_date', 'end_date'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'measurement',
      'idx__measurement__metric_id_log_time_warm_tier',
    );
    await queryRunner.dropIndex(
      'metric_type',
      'idx__metric_type__external_id',
    );
    await queryRunner.dropIndex('metric', 'idx__metric__external_id');
    await queryRunner.dropIndex(
      'metric',
      'idx__metric__metric_type_id_external_id',
    );
    await queryRunner.dropIndex(
      'measurement_partition',
      'idx__measurement_partition__start_date_end_date',
    );

    await queryRunner.dropTable('measurement_partition');
    await queryRunner.dropTable('measurement');
    await queryRunner.dropTable('metric');
    await queryRunner.dropTable('metric_type');
  }
}
