# Metric Server

A server for storing and managing metrics with PostgreSQL partitioning support.

## Features

- **Metric Types**: Define different types of metrics (e.g., CPU usage, memory, etc.)
- **Metrics**: Create metrics under specific metric types
- **Measurements**: Store time-series measurements with automatic partitioning
- **Partitioning**: PostgreSQL native partitioning for efficient time-series data storage
- **Warm/Cold Tier**: Automatic tier management based on configurable retention periods
- **REST API**: Full CRUD API with authentication and authorization

## Configuration

### Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=metric_server
DB_USERNAME=metric_server
DB_PASSWORD=password
DB_SSL=false

# Partition settings
PARTITION_SIZE_DAYS=30
WARM_TIER_RETENTION_DAYS=365

# Server
PORT=3000
```

### Config File

Create a `config/config.yml` file:

```yaml
# Database configuration
database:
  type: postgres
  host: 'localhost'
  port: 5432
  database: metric_server
  username: metric_server
  password: 'password'
  ssl:
    rejectUnauthorized: false

# Authentication configuration
auth:
  type: 'oidc'
  discovery_url: 'https://your-oidc-provider/.well-known/openid-configuration'

# User Access Control configuration
uac:
  type: 'static'
  users:
    - user_id: 'user-id-1'
      permissions:
        - manage_metrics
        - read_metrics
        - write_measurements

# Partition configuration
partition:
  partition_size_days: 30
  warm_tier_retention_days: 365
```

## API Endpoints

### Metric Types

- `POST /metric-types` - Create a new metric type
- `GET /metric-types` - List all metric types
- `GET /metric-types/:id` - Get a specific metric type
- `DELETE /metric-types/:id` - Delete a metric type

### Metrics

- `POST /metrics` - Create a new metric
- `GET /metrics` - List all metrics (optionally filtered by metricTypeId)
- `GET /metrics/:id` - Get a specific metric
- `DELETE /metrics/:id` - Delete a metric

### Measurements

- `POST /measurements` - Create a new measurement
- `POST /measurements/bulk` - Create multiple measurements
- `GET /measurements` - Query measurements with filters
- `GET /measurements/:metricId/latest` - Get latest measurements for a metric
- `GET /measurements/:metricId/aggregate` - Aggregate measurements for a metric

## Database Schema

### Tables

- `metric_type`: Stores metric types
- `metric`: Stores metrics
- `measurement`: Stores time-series measurements (partitioned)
- `measurement_partition`: Tracks created partitions

### Partitioning

The `measurement` table is automatically partitioned by time ranges. Each partition covers a configurable number of days (default: 30 days). Partitions are automatically created when new measurements are inserted.

Partitions are tracked in the `measurement_partition` table and can be in either warm or cold tier based on the configured retention period.

## Running the Server

```bash
# Development
npm run start

# Production
npm run build
npm run start:prod

# With Docker
docker build -t metric-server .
docker run -p 3000:8080 metric-server
```

## Running Migrations

```bash
npm run migration:run
```

## Testing

```bash
npm run test
npm run test:e2e
```
