import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';
import { getDataType } from './utils/data-type.mapper.js';

export class AddDeletionTimeToMetric1700000001000 implements MigrationInterface {
  name = 'AddDeletionTimeToMetric1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const databaseType = queryRunner.connection.driver.options.type;

    // Only PostgreSQL is supported
    if (databaseType !== 'postgres') {
      throw new Error('This migration only supports PostgreSQL database.');
    }

    // Add deletion_time column to metric table
    await queryRunner.addColumn(
      'metric',
      new TableColumn({
        name: 'deletion_time',
        type: getDataType(databaseType, 'timestamp'),
        isNullable: true,
      }),
    );

    // Drop existing indices on external_id for metric table
    await queryRunner.dropIndex('metric', 'idx__metric__external_id');
    await queryRunner.dropIndex('metric', 'idx__metric__metric_type_id_external_id');

    // Create new partial indices that exclude deleted entries
    // Index for external_id only (unique for non-null, non-deleted)
    await queryRunner.createIndex(
      'metric',
      new TableIndex({
        name: 'idx__metric__external_id',
        columnNames: ['external_id'],
        isUnique: true,
        where: 'external_id IS NOT NULL AND deletion_time IS NULL',
      }),
    );

    // Composite index for metric_type_id + external_id (unique for non-null, non-deleted)
    await queryRunner.createIndex(
      'metric',
      new TableIndex({
        name: 'idx__metric__metric_type_id_external_id',
        columnNames: ['metric_type_id', 'external_id'],
        isUnique: true,
        where: 'external_id IS NOT NULL AND deletion_time IS NULL',
      }),
    );

    // Optional: Add index on deletion_time for faster queries filtering deleted records
    await queryRunner.createIndex(
      'metric',
      new TableIndex({
        name: 'idx__metric__deletion_time',
        columnNames: ['deletion_time'],
        where: 'deletion_time IS NOT NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const databaseType = queryRunner.connection.driver.options.type;

    // Only PostgreSQL is supported
    if (databaseType !== 'postgres') {
      throw new Error('This migration only supports PostgreSQL database.');
    }

    // Drop the new indices first
    await queryRunner.dropIndex('metric', 'idx__metric__deletion_time');
    await queryRunner.dropIndex('metric', 'idx__metric__metric_type_id_external_id');
    await queryRunner.dropIndex('metric', 'idx__metric__external_id');

    // Restore original indices
    await queryRunner.createIndex(
      'metric',
      new TableIndex({
        name: 'idx__metric__external_id',
        columnNames: ['external_id'],
        isUnique: true,
        where: 'external_id IS NOT NULL',
      }),
    );

    await queryRunner.createIndex(
      'metric',
      new TableIndex({
        name: 'idx__metric__metric_type_id_external_id',
        columnNames: ['metric_type_id', 'external_id'],
        isUnique: true,
        where: 'external_id IS NOT NULL',
      }),
    );

    // Remove deletion_time column
    await queryRunner.dropColumn('metric', 'deletion_time');
  }
}
