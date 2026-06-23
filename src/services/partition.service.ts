import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { MeasurementPartition } from '../database/entities/measurement-partition.entity.js';

@Injectable()
export class PartitionService {
  private readonly logger = new Logger(PartitionService.name);
  private partitionSizeDays: number;
  private warmTierRetentionDays: number;

  constructor(
    @InjectRepository(MeasurementPartition)
    private readonly partitionRepository: Repository<MeasurementPartition>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.partitionSizeDays = parseInt(
      this.configService.get<string>('partition.partition_size_days') || '30',
    );
    this.warmTierRetentionDays = parseInt(
      this.configService.get<string>('partition.warm_tier_retention_days') ||
        '365',
    );
  }

  /**
   * Ensures that a partition exists for the given date range
   */
  async ensurePartitionForDate(logTime: Date): Promise<void> {
    const partitionStart = this.getPartitionStartDate(logTime);
    const partitionEnd = this.getPartitionEndDate(partitionStart);

    // Check if partition already exists in our tracking table
    const existingPartition = await this.partitionRepository.findOne({
      where: {
        startDate: partitionStart,
        endDate: partitionEnd,
      },
    });

    if (existingPartition) {
      this.logger.debug(
        `Partition for ${partitionStart.toISOString()} - ${partitionEnd.toISOString()} already exists`,
      );
      return;
    }

    // Check if the PostgreSQL partition already exists
    const partitionName = this.generatePartitionName(partitionStart, partitionEnd);
    const postgresPartitionExists = await this.postgresPartitionExists(partitionName);

    if (postgresPartitionExists) {
      // Partition exists in PostgreSQL but not in our tracking table
      // Add it to our tracking table
      const now = new Date();
      const isWarmTier = partitionEnd >= this.getDateDaysAgo(now, this.warmTierRetentionDays);

      const newPartition = this.partitionRepository.create({
        startDate: partitionStart,
        endDate: partitionEnd,
        isWarmTier,
      });

      await this.partitionRepository.save(newPartition);
      this.logger.log(
        `Added existing PostgreSQL partition to tracking table: ${partitionName}`,
      );
      return;
    }

    // Determine if this partition should be warm tier
    const now = new Date();
    const isWarmTier = partitionEnd >= this.getDateDaysAgo(now, this.warmTierRetentionDays);

    // Create the PostgreSQL partition first
    await this.createPostgresPartition(partitionName, partitionStart, partitionEnd);

    // Then create the partition record in our tracking table
    const newPartition = this.partitionRepository.create({
      startDate: partitionStart,
      endDate: partitionEnd,
      isWarmTier,
    });

    await this.partitionRepository.save(newPartition);

    this.logger.log(
      `Created new partition ${partitionName} for ${partitionStart.toISOString()} - ${partitionEnd.toISOString()} (warm_tier: ${isWarmTier})`,
    );
  }

  /**
   * Checks if a PostgreSQL partition exists
   */
  private async postgresPartitionExists(partitionName: string): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();

      const { rows } = await queryRunner.query(`
        SELECT 1 FROM pg_class WHERE relname = 'measurement_${partitionName}'
      `);

      return rows.length > 0;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Creates a PostgreSQL partition for the measurement table
   */
  private async createPostgresPartition(
    partitionName: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // Format dates for PostgreSQL (using UTC ISO format without timezone)
      const formatDateForSql = (date: Date) => {
        return date.toISOString().replace('T', ' ').split('.')[0];
      };

      // Create the partition
      await queryRunner.query(`
        CREATE TABLE measurement_${partitionName} PARTITION OF measurement
        FOR VALUES FROM ('${formatDateForSql(startDate)}') TO ('${formatDateForSql(endDate)}')
      `);

      // Create covering index on the partition for warm tier data
      // INCLUDE (value, meta) makes this a covering index for most queries
      await queryRunner.query(`
        CREATE INDEX idx_measurement_${partitionName}_covering_warm
        ON measurement_${partitionName} (metric_id, log_time)
        INCLUDE (value, meta)
        WHERE is_warm_tier = true
      `);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to create PostgreSQL partition ${partitionName}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Generates a partition name based on start and end dates
   */
  private generatePartitionName(startDate: Date, endDate: Date): string {
    const formatDate = (date: Date) => date.toISOString().split('T')[0].replace(/-/g, '');
    return `${formatDate(startDate)}_${formatDate(endDate)}`;
  }

  /**
   * Gets the start date of the partition for a given date
   */
  private getPartitionStartDate(date: Date): Date {
    const startDate = new Date(date);
    startDate.setUTCHours(0, 0, 0, 0);
    // Align with partition boundaries
    const daysSinceEpoch = Math.floor(
      startDate.getTime() / (24 * 60 * 60 * 1000),
    );
    const partitionStartDays = Math.floor(daysSinceEpoch / this.partitionSizeDays) * this.partitionSizeDays;
    startDate.setTime(partitionStartDays * 24 * 60 * 60 * 1000);
    return startDate;
  }

  /**
   * Gets the end date of the partition for a given start date
   */
  private getPartitionEndDate(startDate: Date): Date {
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + this.partitionSizeDays);
    return endDate;
  }

  /**
   * Gets a date that is a certain number of days ago
   */
  private getDateDaysAgo(date: Date, days: number): Date {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() - days);
    return result;
  }

  /**
   * Ensures partitions exist for a range of dates
   */
  async ensurePartitionsForRange(startDate: Date, endDate: Date): Promise<void> {
    const currentDate = new Date(startDate);
    const partitionEnd = new Date(endDate);

    while (currentDate < partitionEnd) {
      await this.ensurePartitionForDate(currentDate);
      currentDate.setUTCDate(currentDate.getUTCDate() + this.partitionSizeDays);
    }
  }

  /**
   * Gets the partition for a given date
   */
  async getPartitionForDate(logTime: Date): Promise<MeasurementPartition | null> {
    const partitionStart = this.getPartitionStartDate(logTime);
    const partitionEnd = this.getPartitionEndDate(partitionStart);

    return this.partitionRepository.findOne({
      where: {
        startDate: partitionStart,
        endDate: partitionEnd,
      },
    });
  }

  /**
   * Lists all partitions
   */
  async listPartitions(): Promise<MeasurementPartition[]> {
    return this.partitionRepository.find({
      order: { startDate: 'ASC' },
    });
  }

  /**
   * Lists all PostgreSQL partitions
   */
  async listPostgresPartitions(): Promise<string[]> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();

      const { rows } = await queryRunner.query(`
        SELECT relname FROM pg_class 
        WHERE relname LIKE 'measurement_%' 
        AND relkind = 'r'
        ORDER BY relname
      `);

      return rows.map((row) => row.relname);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Updates partition tiers based on retention configuration
   */
  async updatePartitionTiers(): Promise<void> {
    const now = new Date();
    const coldTierThreshold = this.getDateDaysAgo(now, this.warmTierRetentionDays);

    // Find partitions that should be cold tier
    const partitionsToUpdate = await this.partitionRepository.find({
      where: {
        endDate: LessThan(coldTierThreshold),
        isWarmTier: true,
      },
    });

    for (const partition of partitionsToUpdate) {
      await this.partitionRepository.update(
        { startDate: partition.startDate, endDate: partition.endDate },
        { isWarmTier: false },
      );

      this.logger.log(
        `Moved partition ${this.generatePartitionName(partition.startDate, partition.endDate)} to cold tier`,
      );
    }
  }

  /**
   * Gets the current partition configuration
   */
  getPartitionConfig() {
    return {
      partitionSizeDays: this.partitionSizeDays,
      warmTierRetentionDays: this.warmTierRetentionDays,
    };
  }
}
