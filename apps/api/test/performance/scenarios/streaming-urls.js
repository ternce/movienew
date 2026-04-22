import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, strictThresholds, jsonHeaders, rampingStages } from '../k6-config.js';

export const options = {
  scenarios: {
    streaming_urls: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: rampingStages(100),
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    ...strictThresholds,
    'http_req_duration{endpoint:stream}': ['p(95)<200'],
  },
};

// Pre-configured test token (set via environment)
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const CONTENT_IDS = [
  'content-001',
  'content-002',
  'content-003',
  'content-004',
  'content-005',
];

export default function () {
  if (!AUTH_TOKEN) {
    // Without auth, test that endpoint requires authentication
    const res = http.get(
      `${BASE_URL}/content/${CONTENT_IDS[0]}/stream`,
      { headers: jsonHeaders(), tags: { endpoint: 'stream' } },
    );

    check(res, {
      'stream without auth: status 401': (r) => r.status === 401,
    });

    sleep(1);
    return;
  }

  const contentId = CONTENT_IDS[Math.floor(Math.random() * CONTENT_IDS.length)];

  const streamRes = http.get(
    `${BASE_URL}/content/${contentId}/stream`,
    { headers: jsonHeaders(AUTH_TOKEN), tags: { endpoint: 'stream' } },
  );

  check(streamRes, {
    'stream: status 200 or 404': (r) => [200, 404].includes(r.status),
    'stream: response time < 200ms': (r) => r.timings.duration < 200,
    'stream: has stream URL': (r) => {
      if (r.status !== 200) return true;
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.streamUrl;
      } catch {
        return false;
      }
    },
  });

  sleep(Math.random() * 3 + 2);
}
