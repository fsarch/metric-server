/**
 * k6 Load Test for metric-server - Measurements Generation
 * 
 * This script generates random measurement data for load testing.
 * 
 * Environment Variables:
 *   - K6_BASE_URL: Base URL of the metric-server (default: http://localhost:3000)
 *   - K6_ACCESS_TOKEN: Bearer token for authentication (required)
 *   - K6_METRIC_ID: Metric ID to post measurements to (required for single measurement endpoint)
 *   - K6_VUS: Number of virtual users (default: 10)
 *   - K6_DURATION: Test duration in seconds (default: 60s)
 *   - K6_BULK_SIZE: Number of measurements per bulk request (default: 100)
 * 
 * Usage:
 *   # Single measurement endpoint test
 *   k6 run --env K6_ACCESS_TOKEN=xxx --env K6_METRIC_ID=xxx k6/measurements.js
 * 
 *   # Bulk measurement endpoint test
 *   k6 run --env K6_ACCESS_TOKEN=xxx k6/measurements.js
 * 
 *   # With custom settings
 *   k6 run --env K6_ACCESS_TOKEN=xxx --env K6_METRIC_ID=xxx --env K6_VUS=50 --env K6_DURATION=300 k6/measurements.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Configuration from environment variables
const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3000';
const ACCESS_TOKEN = __ENV.K6_ACCESS_TOKEN;
const METRIC_ID = __ENV.K6_METRIC_ID;
const VUS = parseInt(__ENV.K6_VUS) || 10;
const DURATION = __ENV.K6_DURATION || '60s';
const BULK_SIZE = parseInt(__ENV.K6_BULK_SIZE) || 100;

// Validate required configuration
if (!ACCESS_TOKEN) {
  throw new Error('K6_ACCESS_TOKEN environment variable is required');
}

// Headers for authenticated requests
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${ACCESS_TOKEN}`,
};

// Generate random date within last 30 days
export function randomDate() {
  const now = new Date();
  const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
}

// Generate random decimal value
export function randomValue() {
  return parseFloat((Math.random() * 1000).toFixed(2));
}

// Generate random meta data
export function randomMeta() {
  const units = ['percent', 'mb', 'gb', 'ms', 'seconds', 'count'];
  const sources = ['prometheus', 'node-exporter', 'custom', 'api-gateway', 'database'];
  return {
    unit: units[Math.floor(Math.random() * units.length)],
    source: sources[Math.floor(Math.random() * sources.length)],
    version: `v${Math.floor(Math.random() * 10) + 1}`,
  };
}

// Create single measurement payload
export function createMeasurementPayload(metricId) {
  return {
    logTime: randomDate().toISOString(),
    value: randomValue(),
    meta: randomMeta(),
    isWarmTier: true,
  };
}

// Test: Single measurement creation
function testSingleMeasurement() {
  if (!METRIC_ID) {
    console.warn('K6_METRIC_ID not set, skipping single measurement test');
    return;
  }

  const url = `${BASE_URL}/metrics/${METRIC_ID}/measurements`;
  const payload = JSON.stringify(createMeasurementPayload(METRIC_ID));

  const res = http.post(url, payload, { headers });

  check(res, {
    'Single measurement: status is 201': (r) => r.status === 201,
    'Single measurement: response has metricId': (r) => {
      const body = JSON.parse(r.body);
      return body && body.metricId === METRIC_ID;
    },
    'Single measurement: response has value': (r) => {
      const body = JSON.parse(r.body);
      return body && typeof body.value === 'number';
    },
  });

  sleep(1);
}

// Test: Bulk measurement creation
function testBulkMeasurements() {
  const url = `${BASE_URL}/measurements/_actions/bulk`;

  // Generate bulk payload
  const measurements = [];
  for (let i = 0; i < BULK_SIZE; i++) {
    // Use a random metric ID or the provided one
    const metricId = METRIC_ID || `metric-id-${Math.floor(Math.random() * 100)}`;
    measurements.push({
      metricId,
      logTime: randomDate().toISOString(),
      value: randomValue(),
      meta: randomMeta(),
      isWarmTier: true,
    });
  }

  const payload = JSON.stringify(measurements);

  const res = http.post(url, payload, { headers });

  check(res, {
    'Bulk measurements: status is 201': (r) => r.status === 201,
    'Bulk measurements: response is array': (r) => {
      const body = JSON.parse(r.body);
      return Array.isArray(body);
    },
    `Bulk measurements: response has ${BULK_SIZE} items`: (r) => {
      const body = JSON.parse(r.body);
      return body && body.length === BULK_SIZE;
    },
  });

  sleep(1);
}

// Test: Get latest measurements for a metric
function testGetLatestMeasurements() {
  if (!METRIC_ID) {
    console.warn('K6_METRIC_ID not set, skipping get latest measurements test');
    return;
  }

  const url = `${BASE_URL}/metrics/${METRIC_ID}/measurements?limit=100`;

  const res = http.get(url, { headers });

  check(res, {
    'Get latest measurements: status is 200': (r) => r.status === 200,
    'Get latest measurements: response has data': (r) => {
      const body = JSON.parse(r.body);
      return body && body.data && Array.isArray(body.data);
    },
    'Get latest measurements: data has metricId': (r) => {
      const body = JSON.parse(r.body);
      return body.data.every((item) => item.metricId === METRIC_ID);
    },
  });

  sleep(1);
}

// Test: Aggregate measurements
function testAggregateMeasurements() {
  if (!METRIC_ID) {
    console.warn('K6_METRIC_ID not set, skipping aggregate measurements test');
    return;
  }

  const url = `${BASE_URL}/metrics/${METRIC_ID}/measurements/_actions/aggregate`;

  const now = new Date();
  const startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); // Last 7 days
  const endTime = now.toISOString();

  const payload = JSON.stringify({
    startTime,
    endTime,
    interval: 'day',
    aggregation: 'sum',
    warmTierOnly: true,
  });

  const res = http.post(url, payload, { headers });

  check(res, {
    'Aggregate measurements: status is 200': (r) => r.status === 200,
    'Aggregate measurements: response is object': (r) => {
      const body = JSON.parse(r.body);
      return body && typeof body === 'object';
    },
  });

  sleep(1);
}

// Setup function - runs once before the test
export function setup() {
  console.log(`k6 Load Test Configuration:`);
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  VUs: ${VUS}`);
  console.log(`  Duration: ${DURATION}`);
  console.log(`  Bulk Size: ${BULK_SIZE}`);
  console.log(`  Metric ID: ${METRIC_ID || 'random'}`);
  
  return { baseUrl: BASE_URL };
}

// Main test scenarios
export const options = {
  vus: VUS,
  duration: DURATION,
};

export default function () {
  // Randomly select a test scenario (weighted towards bulk for load testing)
  const scenario = Math.random();

  if (scenario < 0.4 && METRIC_ID) {
    testSingleMeasurement();
  } else if (scenario < 0.8) {
    testBulkMeasurements();
  } else if (scenario < 0.9 && METRIC_ID) {
    testGetLatestMeasurements();
  } else if (METRIC_ID) {
    testAggregateMeasurements();
  } else {
    testBulkMeasurements();
  }
}
