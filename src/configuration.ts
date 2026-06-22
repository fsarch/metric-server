export default () => ({
  partition: {
    partition_size_days: parseInt(process.env.PARTITION_SIZE_DAYS || '30'),
    warm_tier_retention_days: parseInt(
      process.env.WARM_TIER_RETENTION_DAYS || '365',
    ),
  },
});
