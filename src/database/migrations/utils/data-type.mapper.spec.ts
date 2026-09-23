import { describe, expect, it } from 'vitest';
import { getDataType } from './data-type.mapper';

describe('getDataType', () => {
  it('maps known data types to their postgres column type', () => {
    expect(getDataType('postgres', 'timestamp')).toBe('TIMESTAMPTZ');
    expect(getDataType('postgres', 'boolean')).toBe('BOOL');
    expect(getDataType('postgres', 'smallint')).toBe('INT2');
    expect(getDataType('postgres', 'decimal')).toBe('DECIMAL');
  });

  it('throws for unsupported database drivers', () => {
    expect(() => getDataType('mysql', 'timestamp')).toThrow(
      'unsupported database type - only postgres is allowed',
    );
  });
});
