/**
 * Shared k6 Configuration
 *
 * Base URL, thresholds, and utility functions used across all performance scenarios.
 * Usage: import { BASE_URL, thresholds, headers } from '../k6-config.js';
 */

export const BASE_URL = __ENV.API_URL || 'http://localhost:4000/api/v1';

/**
 * Default performance thresholds
 */
export const thresholds = {
  http_req_failed: [{ threshold: 'rate<0.01', abortOnFail: true }],
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
};

/**
 * Strict thresholds for fast endpoints
 */
export const strictThresholds = {
  http_req_failed: [{ threshold: 'rate<0.01', abortOnFail: true }],
  http_req_duration: ['p(95)<200', 'p(99)<500'],
};

/**
 * Auth thresholds (bcrypt is slow)
 */
export const authThresholds = {
  http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true }],
  http_req_duration: ['p(95)<500', 'p(99)<1500'],
};

/**
 * Default headers for JSON requests
 */
export function jsonHeaders(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

/**
 * Standard ramp-up stages: ramp → steady → ramp-down
 */
export function rampingStages(peakVUs, steadyDuration = '3m') {
  return [
    { duration: '1m', target: peakVUs },
    { duration: steadyDuration, target: peakVUs },
    { duration: '1m', target: 0 },
  ];
}

/**
 * Check JSON response and return parsed body
 */
export function checkJsonResponse(res, expectedStatus = 200) {
  const passed = res.status === expectedStatus;
  if (!passed) {
    console.warn(`Expected ${expectedStatus}, got ${res.status}: ${res.body}`);
  }
  try {
    return JSON.parse(res.body);
  } catch {
    return null;
  }
}
