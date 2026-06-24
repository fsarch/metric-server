# metric-server Project Conventions

This document outlines the architectural conventions and structure for the metric-server project based on `@fsarch/server`. Follow these guidelines to ensure consistency across the codebase.

---

## Module & Controller Structure

### Directory Naming Rules

- **Controller directories**: Use **PLURAL** form (e.g., `metrics/`, `metric-types/`, `measurements/`)
- **Service files**: Use **SINGULAR** form (e.g., `metric.service.ts`, `measurement.service.ts`)
- **Controller classes**: Use **SINGULAR** form (e.g., `MetricController`, `MeasurementController`)

### Standard Structure

```
src/controllers/
├── controllers.module.ts           # Root module importing all sub-modules
├── measurements/                    # Plural: Controller directory
│   ├── measurement.controller.ts   # Handles POST /measurements/_actions/bulk
│   ├── measurement.module.ts
│   └── measurement.service.ts      # Singular: Service file
├── metric-types/                   # Plural: Controller directory
│   ├── metric-type.controller.ts   # Handles /metric-types endpoints
│   └── metric-type.module.ts
└── metrics/                        # Plural: Controller directory
    ├── metric.controller.ts        # Handles /metrics endpoints
    ├── metric.module.ts
    ├── metric.service.ts           # Singular: Service file
    └── metric-measurements/        # Plural: Nested controller directory
        ├── measurement.controller.ts # Handles /metrics/:metricId/measurements
        └── measurement.module.ts
```

### Module Dependencies

- **metric-types module** depends on **metrics module** (for `MetricService`)
- **metrics/metric-measurements module** depends on **measurements module** (for `MeasurementService`)
- **controllers.module.ts** imports all controller modules

---

## Endpoint Structure

### RESTful Routes

| HTTP | Endpoint | Controller | Description |
|------|----------|-----------|-------------|
| GET | `/metric-types` | MetricTypeController | List all metric types |
| POST | `/metric-types` | MetricTypeController | Create metric type |
| GET | `/metric-types/:id` | MetricTypeController | Get metric type by ID |
| DELETE | `/metric-types/:id` | MetricTypeController | Delete metric type |
| GET | `/metrics` | MetricController | List all metrics |
| POST | `/metrics` | MetricController | Create metric |
| GET | `/metrics/:id` | MetricController | Get metric by ID |
| DELETE | `/metrics/:id` | MetricController | Delete metric |
| GET | `/metrics/:metricId/measurements` | MeasurementController | Get latest measurements (paginated) |
| POST | `/metrics/:metricId/measurements` | MeasurementController | Create single measurement |
| POST | `/metrics/:metricId/measurements/_actions/aggregate` | MeasurementController | Aggregate measurements |
| POST | `/measurements/_actions/bulk` | MeasurementController | Bulk insert measurements |

### Actions Sub-routes

Use `_actions/` prefix for non-CRUD operations:
- `/metrics/:metricId/measurements/_actions/aggregate` (POST)
- `/measurements/_actions/bulk` (POST)

---

## Database & TypeORM

### Required Database Type

**ONLY PostgreSQL is supported**
- Migrations must block if database type is not `postgres`
- Partitioning features are PostgreSQL-specific

### Migration Conventions

- Block non-PostgreSQL databases at migration start:
  ```typescript
  if (databaseType !== 'postgres') {
    throw new Error('This migration only supports PostgreSQL database.');
  }
  ```

### Table Indexing

- Create indices **directly in table definitions** (except for partitioned tables)
- For partitioned tables (e.g., `measurement`), use raw SQL

### Partitioning (Measurement Table)

- `measurement` table uses **PARTITION BY RANGE (log_time)**
- Partition tracking in `measurement_partition` table
- Partition size configurable via config (`partition.partition_size_days`)
- Warm/cold tier configuration via `partition.warm_tier_retention_days`

### Covering Index

Create covering index for warm tier queries:
```sql
CREATE INDEX idx__measurement__covering_warm
ON measurement (metric_id, log_time)
INCLUDE (value, meta)
WHERE is_warm_tier = true
```

This index is inherited by all partitions automatically.

---

## Configuration

### partition Configuration

```yaml
partition:
  partition_size_days: 30      # Size of each partition in days
  warm_tier_retention_days: 365 # Warm tier retention period
```

### .gitignore

Exclude configuration files:
```gitignore
config/*.yml
config/*.js
```

---

## OpenAPI/Swagger

### Model Decorators

All DTOs must use `@ApiProperty` decorators from `@nestjs/swagger`:

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateMetricTypeDto {
  @ApiProperty({ description: 'Name of the metric type', example: 'cpu_usage' })
  @IsString()
  @MaxLength(2048)
  name: string;
}
```

### Controller Decorators

Use proper response decorators:
- `@ApiBody({ type: DtoClass })` for request bodies
- `@ApiCreatedResponse({ type: ResponseDto })` for 201 responses
- `@ApiOkResponse({ type: ResponseDto })` for 200 responses
- `@ApiOkPaginatedResponse(ResponseDto)` for paginated responses (from `@fsarch/server/pagination`)

---

## Service Organization

### Warm Tier Priority

When querying measurements, **always check warm tier first**:

```typescript
const where: Record<string, unknown> = {
  metricId,
  isWarmTier: true, // Always filter warm tier first
};
```

### Partition Management

Use `PartitionService` to:
- Ensure partitions exist before inserting data
- Check if data belongs to warm or cold tier
- Manage partition lifecycle

### Bulk Operations

When implementing bulk operations:
- **Use transactions** to ensure data consistency
- **Minimize database round-trips** - prefer bulk inserts over individual saves
- **Group by common criteria** (e.g., partition) to reduce redundant checks
- Use `repository.insert()` for bulk inserts instead of looping `save()`

Example:
```typescript
// ❌ Inefficient: N database calls
for (const dto of dtos) {
  await repository.save(entity);
}

// ✅ Efficient: 1 database call
const entities = dtos.map(dto => repository.create(dto));
await repository.insert(entities);
```

### TypeORM Query Safety

When using raw SQL queries with TypeORM's `queryRunner.query()`, **always handle results safely**:

```typescript
// SAFE: Use optional chaining for query results
const result = await queryRunner.query(`SELECT 1 FROM table WHERE ...`);
const hasResults = (result?.rows?.length ?? 0) > 0;
const data = (result?.rows ?? []).map(r => r.column);

// UNSAFE: Direct destructuring may throw if rows is undefined
const { rows } = await queryRunner.query(`SELECT ...`);  // ❌ May throw
return rows.length > 0;  // ❌ TypeError: Cannot read properties of undefined
```

Different database drivers may return query results in different formats. Always use defensive programming.

---

## Naming Summary

| Type | Convention | Example |
|------|------------|---------|
| Controller directory | Plural | `metrics/`, `measurements/` |
| Controller class | Singular | `MetricController`, `MeasurementController` |
| Service file | Singular | `metric.service.ts`, `measurement.service.ts` |
| Entity | Singular | `Metric`, `Measurement` |
| Repository | Singular | `MetricRepository`, `MeasurementRepository` |
| Route (CRUD) | Plural | `/metrics`, `/measurements` |
| Route (nested) | Plural | `/metrics/:id/measurements` |
| Action route | `_actions/` prefix | `/_actions/aggregate`, `/_actions/bulk` |

---

## Documentation

### Requirements Documentation

The `requirements.md` file contains all functional and technical requirements for this project. **Update this file whenever:**

- New endpoints are added or modified
- Database schema changes are requested
- New configuration options are introduced
- Authentication/authorization requirements change
- Query behavior requirements are updated
- API response formats are modified
- Validation rules are added or changed

### Requirements File Structure

The `requirements.md` is organized into sections:

1. **Database Model** - Table definitions, constraints, relationships
2. **Partitioning Requirements** - PostgreSQL-specific partitioning rules
3. **Migration Requirements** - Migration-specific validations and logic
4. **API Requirements** - Authentication, roles, endpoint specifications
5. **Query Behavior** - Filtering, sorting, pagination rules
6. **OpenAPI/Swagger Requirements** - Documentation standards
7. **Project Structure** - Module organization and naming conventions
8. **Configuration** - Environment and config file settings
9. **Validation** - DTO and entity validation rules
10. **File Organization** - Import paths and file naming
11. **Build & Quality** - TypeScript and style requirements

### Version History

Maintain a version history table at the end of `requirements.md`:

```markdown
| Date | Change | Author |
|------|--------|--------|
| YYYY-MM-DD | Description of change | Author |
```

This helps track when requirements were added or modified.

### Cross-References

- Use `AGENTS.md` for **architectural conventions** and **implementation guidelines**
- Use `requirements.md` for **functional requirements** and **technical specifications**
- Both documents should be in **English** to maintain consistency across the repository
