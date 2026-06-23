# metric-server Requirements

This document captures all functional and technical requirements for the metric-server project. Update this file whenever new requirements are identified or existing ones are modified.

---

## Database Model

### Tables

#### metric_type
- `id` UUID [pk]
- `name` varchar(2048)
- `external_id` varchar(2048)
- `creation_time` timestamptz

#### metric
- `id` UUID [pk]
- `name` varchar(2048)
- `metric_type_id` UUID [fk -> metric_type.id]
- `external_id` varchar(2048)
- `creation_time` timestamptz

#### measurement
- `metric_id` UUID [pk, fk -> metric.id]
- `log_time` timestamptz [pk]
- `value` decimal
- `meta` json [default: null]
- `is_warm_tier` boolean [default: true]

#### measurement_partition
- `start_date` timestamptz [pk]
- `end_date` timestamptz [pk]
- `is_warm_tier` boolean

### Database Constraints

- **Only PostgreSQL** is allowed as database type
- Partitioning features require PostgreSQL
- Foreign keys:
  - `measurement.metric_id` -> `metric.id` (CASCADE on delete)
  - `metric.metric_type_id` -> `metric_type.id` (CASCADE on delete)

---

## Partitioning Requirements

### Measurement Table
- Must use **PostgreSQL partition by range** on `log_time`
- Partition tracking in `measurement_partition` table
- When inserting data, check if partition exists for the date range
- If partition doesn't exist, create it automatically

### Partition Configuration
- Partition size **configurable** via configuration file
- Configuration key: `partition.partition_size_days` (default: 30 days)

### Warm/Cold Tier
- Warm tier retention **configurable** via configuration file
- Configuration key: `partition.warm_tier_retention_days` (default: 365 days)
- Data older than warm tier retention moves to cold tier
- **Query priority**: Always check warm tier first (`is_warm_tier = true`)

### Indexing
- **Covering index** on measurement table for warm tier queries:
  ```sql
  CREATE INDEX idx__measurement__covering_warm
  ON measurement (metric_id, log_time)
  INCLUDE (value, meta)
  WHERE is_warm_tier = true
  ```
- This index is inherited by all partitions
- Indices on regular tables (metric_type, metric) defined directly in table creation

---

## Migration Requirements

### PostgreSQL Validation
- **MUST block** if database type is not PostgreSQL
- Check at migration start:
  ```typescript
  if (databaseType !== 'postgres') {
    throw new Error('This migration only supports PostgreSQL database.');
  }
  ```
- Applies to both `up()` and `down()` migration methods

### Partition Management in Down Migration
- When dropping measurement table, **drop all partitions first**
- Query PostgreSQL system catalog to find partitions:
  ```sql
  SELECT relname FROM pg_class 
  WHERE relname LIKE 'measurement_%' AND relkind = 'r'
  ```

---

## API Requirements

### Authentication & Authorization
- Use `@fsarch/server` authentication system
- All endpoints require `@ApiBearerAuth()` decorator
- Use `@AuthGuard` from `@fsarch/server/auth`
- Use `@Roles()` from `@fsarch/server/uac` for role-based access

### Required Roles
- `manage_metrics` - Create, update, delete metrics and metric types
- `read_metrics` - Read metrics, metric types, and measurements
- `write_measurements` - Create measurements

---

## Endpoints

### Metric Types (`/metric-types`)

| Method | Endpoint | Description | DTO (Request) | DTO (Response) | Roles |
|--------|----------|-------------|---------------|----------------|-------|
| GET | `/metric-types` | List all metric types | - | MetricTypeDto[] | read_metrics |
| POST | `/metric-types` | Create metric type | CreateMetricTypeDto | MetricTypeDto | manage_metrics |
| GET | `/metric-types/:id` | Get metric type by ID | - | MetricTypeDto | read_metrics |
| DELETE | `/metric-types/:id` | Delete metric type | - | - | manage_metrics |

### Metrics (`/metrics`)

| Method | Endpoint | Description | DTO (Request) | DTO (Response) | Roles |
|--------|----------|-------------|---------------|----------------|-------|
| GET | `/metrics` | List all metrics | - | MetricDto[] | read_metrics |
| POST | `/metrics` | Create metric | CreateMetricDto | MetricDto | manage_metrics |
| GET | `/metrics/:id` | Get metric by ID | - | MetricDto | read_metrics |
| DELETE | `/metrics/:id` | Delete metric | - | - | manage_metrics |

### Measurements per Metric (`/metrics/:metricId/measurements`)

| Method | Endpoint | Description | DTO (Request) | DTO (Response) | Roles |
|--------|----------|-------------|---------------|----------------|-------|
| GET | `/metrics/:metricId/measurements` | Get latest measurements (paginated) | - | MeasurementDto[] | read_metrics |
| POST | `/metrics/:metricId/measurements` | Create single measurement | CreateMeasurementDto (without metricId) | MeasurementDto | write_measurements |
| POST | `/metrics/:metricId/measurements/_actions/aggregate` | Aggregate measurements | AggregateMeasurementsDto | Record<string, number> | read_metrics |

### Bulk Measurements (`/measurements`)

| Method | Endpoint | Description | DTO (Request) | DTO (Response) | Roles |
|--------|----------|-------------|---------------|----------------|-------|
| POST | `/measurements/_actions/bulk` | Bulk insert measurements | CreateMeasurementDto[] | MeasurementDto[] | write_measurements |

---

## Query Behavior

### Warm Tier Priority
- **ALWAYS** check `is_warm_tier = true` first when querying measurements
- Filter by warm tier before applying other filters (time range, etc.)
- This leverages the covering index for better performance

### Measurement Queries
- Latest measurements endpoint: Return most recent data first (DESC by log_time)
- Aggregation: Support sum, min, max, count, avg operations
- Time range filtering: Use `startTime` and `endTime` query parameters
- Pagination: Support `limit` and `offset` parameters

---

## OpenAPI/Swagger Requirements

### Model Documentation
- **ALL DTOs** must have `@ApiProperty` decorators
- Include `description` and `example` in `@ApiProperty`
- Mark optional fields with `required: false` or `nullable: true`

### Controller Documentation
- Use `@ApiBearerAuth()` on all controllers
- Use `@ApiBody({ type: DtoClass })` for request bodies
- Use `@ApiCreatedResponse({ type: ResponseDto })` for POST endpoints
- Use `@ApiOkResponse({ type: ResponseDto })` for GET endpoints
- Use `@ApiOkPaginatedResponse(ResponseDto)` for paginated endpoints (from `@fsarch/server/pagination`)

---

## Project Structure

### Module Organization
- **Controllers directory**: Use **PLURAL** form (e.g., `metrics/`, `metric-types/`, `measurements/`)
- **Service files**: Use **SINGULAR** form (e.g., `metric.service.ts`, `measurement.service.ts`)
- **Controller classes**: Use **SINGULAR** form (e.g., `MetricController`, `MeasurementController`)

### Separate Controller Classes
- **DO NOT** put multiple controller classes in a single file
- Each controller class gets its own file
- Exception: Only when controllers are very small and tightly related

### Module Separation
- Each major entity type gets its own module directory
- Nested modules for related sub-entities (e.g., `metrics/metric-measurements/`)
- metric-type module must be at root level (not nested)

---

## Configuration

### Database Configuration
- Type: postgres
- Host, port, database, username, password as required
- SSL configuration optional

### Partition Configuration
```yaml
partition:
  partition_size_days: 30      # Number of days per partition
  warm_tier_retention_days: 365 # Days to keep data in warm tier
```

### .gitignore
- Exclude all configuration files: `config/*.yml`, `config/*.js`
- Standard Node.js exclusions (node_modules, dist, build, etc.)

---

## Validation

### DTO Validation
- Use `class-validator` decorators on all DTOs
- Required: `@IsString()`, `@IsUUID()`, `@IsNumber()`, etc.
- Optional fields: `@IsOptional()`
- String lengths: `@MaxLength()`
- Date validation: `@IsDateString()`

### Entity Constraints
- Primary keys: UUID with `primaryKeyConstraintName`
- Foreign keys: Define with `onDelete: 'CASCADE'` where appropriate
- Unique constraints on external_id where not null

---

## File Organization

### File Extensions
- Use `.ts` for TypeScript files
- Use `.js` in import statements (ES modules)

### Import Paths
- Use relative paths from current file location
- Example: `import { MetricService } from '../metrics/metric.service.js'`

---

## Build & Quality

### TypeScript
- Strict mode enabled
- All code must pass `npm run build` without errors
- No TypeScript errors allowed in committed code

### Code Style
- Follow existing code style in the repository
- Use Prettier for formatting
- Match indentation and naming conventions

---

## Version History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-23 | Initial requirements documentation | - |
