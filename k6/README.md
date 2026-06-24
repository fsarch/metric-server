# k6 Load Tests for metric-server

This directory contains k6 load test scripts for the metric-server API.

## Prerequisites

- [k6 installed](https://k6.io/docs/get-started/installation/)
- Running metric-server instance
- Valid access token for authentication

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `K6_BASE_URL` | No | `http://localhost:3000` | Base URL of the metric-server |
| `K6_ACCESS_TOKEN` | **Yes** | - | Bearer token for authentication |
| `K6_METRIC_ID` | No | - | Metric ID for single measurement tests |
| `K6_VUS` | No | `10` | Number of virtual users |
| `K6_DURATION` | No | `60s` | Test duration (e.g., `30s`, `2m`, `5m`) |
| `K6_BULK_SIZE` | No | `100` | Number of measurements per bulk request |

## Quick Start

### 1. Install k6

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo apt-get install k6

# Windows (Chocolatey)
choco install k6
```

### 2. Run a Load Test

#### Bulk Measurements Only (no METRIC_ID required)
```bash
k6 run --env K6_ACCESS_TOKEN=your-token-here k6/measurements.js
```

#### Single Measurements (METRIC_ID required)
```bash
k6 run \
  --env K6_ACCESS_TOKEN=your-token-here \
  --env K6_METRIC_ID=your-metric-id-here \
  k6/measurements.js
```

#### Custom Configuration
```bash
k6 run \
  --env K6_ACCESS_TOKEN=your-token-here \
  --env K6_METRIC_ID=your-metric-id-here \
  --env K6_VUS=50 \
  --env K6_DURATION=5m \
  --env K6_BULK_SIZE=200 \
  k6/measurements.js
```

#### With Environment File

Create a `.env` file in the k6 directory:
```bash
K6_ACCESS_TOKEN=your-token-here
K6_METRIC_ID=your-metric-id-here
K6_VUS=20
K6_DURATION=2m
K6_BULK_SIZE=150
```

**Important:** k6 does NOT automatically load `.env` files like Node.js does.
You have two options:

#### Option 1: Pass variables directly (recommended)
```bash
k6 run --env K6_ACCESS_TOKEN=your-token --env K6_METRIC_ID=your-id k6/measurements.js
```

#### Option 2: Use -e shorthand
```bash
k6 run -e K6_ACCESS_TOKEN=your-token -e K6_METRIC_ID=your-id k6/measurements.js
```

#### Option 3: Load from .env file using shell
```bash
# On Unix/macOS
set -a && source k6/.env && k6 run --env K6_ACCESS_TOKEN --env K6_METRIC_ID k6/measurements.js
set +a

# Or simpler: export and use
K6_ACCESS_TOKEN=$(grep K6_ACCESS_TOKEN k6/.env | cut -d= -f2) \
K6_METRIC_ID=$(grep K6_METRIC_ID k6/.env | cut -d= -f2) \
k6 run --env K6_ACCESS_TOKEN=$K6_ACCESS_TOKEN --env K6_METRIC_ID=$K6_METRIC_ID k6/measurements.js
```

## Test Scenarios

The `measurements.js` script tests the following endpoints with random data:

1. **POST `/metrics/:metricId/measurements`** - Single measurement creation (40% probability)
2. **POST `/measurements/_actions/bulk`** - Bulk measurement insertion (40% probability)
3. **GET `/metrics/:metricId/measurements`** - Get latest measurements (10% probability)
4. **POST `/metrics/:metricId/measurements/_actions/aggregate`** - Aggregate measurements (10% probability)

### Random Data Generation

- **log_time**: Random date within last 30 days
- **value**: Random decimal between 0 and 1000 (2 decimal places)
- **meta**: Random unit, source, and version
- **is_warm_tier**: Always `true`

## Running Specific Tests

To run only bulk tests:
```bash
k6 run --env K6_ACCESS_TOKEN=xxx --stages 1:10,10:60,10:10 k6/measurements.js
```

To run with ramping VUs:
```bash
k6 run \
  --env K6_ACCESS_TOKEN=xxx \
  --stages 1:10,10:60,10:10 \
  k6/measurements.js
```

## Output

k6 provides detailed metrics:
- HTTP requests per second (RPS)
- Response times (avg, p90, p95, max)
- Error rates
- Data sent/received

Example output:
```
running (60s)

     ✓ Bulk measurements: status is 201
     ✓ Bulk measurements: response is array
     ✓ Bulk measurements: response has 100 items

     checks.........................: 100.00% ✓ 179     ✗ 0
     data_received..................: 1.2 MB  20 kB/s
     data_sent......................: 562 kB 9.4 kB/s
     http_req_duration..............: avg=102.45ms min=50ms   med=95ms    max=450ms
     http_req_failed................: 0.00%  ✓ 0        ✗ 180
     http_reqs......................: 180    3.000000/s
```

## Creating Custom Tests

To create additional test scripts:

1. Create a new `.js` file in this directory
2. Import required k6 modules:
   ```javascript
   import http from 'k6/http';
   import { check, sleep } from 'k6';
   ```
3. Set up environment variables
4. Define test functions
5. Export default function with test logic

## Best Practices

- Start with low VU counts (1-5) and gradually increase
- Monitor server resources during tests
- Use realistic data volumes
- Test both single and bulk endpoints
- Verify error handling with invalid data

## Troubleshooting

### Common Issues

1. **Authentication errors**
   - Verify `K6_ACCESS_TOKEN` is valid
   - Check token hasn't expired

2. **Connection errors**
   - Verify `K6_BASE_URL` is correct
   - Check if server is running

3. **404 Not Found**
   - Verify endpoint paths match your API
   - Check if routes are properly registered

4. **Rate limiting**
   - Reduce VU count
   - Add `sleep()` calls between requests

## License

The k6 scripts in this directory are part of the metric-server project and share the same license.
