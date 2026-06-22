import { DatabaseType } from 'typeorm';

const DATA_TYPES: Record<
  'timestamp' | 'boolean' | 'smallint' | 'decimal',
  Record<'postgres', string>
> = {
  timestamp: {
    postgres: 'TIMESTAMPTZ',
  },
  boolean: {
    postgres: 'BOOL',
  },
  smallint: {
    postgres: 'INT2',
  },
  decimal: {
    postgres: 'DECIMAL',
  },
};

export const getDataType = (
  driver: DatabaseType,
  dataType: keyof typeof DATA_TYPES,
) => {
  if (driver !== 'postgres') {
    throw new Error('unsupported database type - only postgres is allowed');
  }

  return DATA_TYPES[dataType][driver];
};
