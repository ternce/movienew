import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, thresholds, jsonHeaders, rampingStages } from '../k6-config.js';

export const options = {
  scenarios: {
    mixed_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 500 },
        { duration: '3m', target: 1000 },
        { duration: '5m', target: 1000 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    ...thresholds,
    'http_req_duration{action:browse}': ['p(95)<300'],
    'http_req_duration{action:search}': ['p(95)<400'],
    'http_req_duration{action:auth}': ['p(95)<500'],
    'http_req_duration{action:stream}': ['p(95)<300'],
    'http_req_duration{action:store}': ['p(95)<300'],
  },
};

const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const SEARCH_TERMS = ['сериал', 'комедия', 'экшн', 'драма', 'фантастика', 'урок'];
const CONTENT_TYPES = ['SERIES', 'CLIP', 'SHORT', 'TUTORIAL'];

function browsing() {
  const contentType = CONTENT_TYPES[Math.floor(Math.random() * CONTENT_TYPES.length)];
  const page = Math.floor(Math.random() * 5) + 1;

  const res = http.get(
    `${BASE_URL}/content?type=${contentType}&page=${page}&limit=20`,
    { headers: jsonHeaders(), tags: { action: 'browse' } },
  );

  check(res, { 'browse: status ok': (r) => [200, 304].includes(r.status) });
}

function searching() {
  const query = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];

  const res = http.get(
    `${BASE_URL}/content/search?q=${encodeURIComponent(query)}&limit=20`,
    { headers: jsonHeaders(), tags: { action: 'search' } },
  );

  check(res, { 'search: status ok': (r) => r.status === 200 });
}

function authenticating() {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: 'perf-test@example.com',
      password: 'TestPassword123!',
    }),
    { headers: jsonHeaders(), tags: { action: 'auth' } },
  );

  check(res, { 'auth: status ok': (r) => [200, 401, 429].includes(r.status) });
}

function streaming() {
  const headers = AUTH_TOKEN ? jsonHeaders(AUTH_TOKEN) : jsonHeaders();

  const res = http.get(
    `${BASE_URL}/content/content-001/stream`,
    { headers, tags: { action: 'stream' } },
  );

  check(res, { 'stream: status ok': (r) => [200, 401, 404].includes(r.status) });
}

function storeActivity() {
  const res = http.get(
    `${BASE_URL}/store/products?page=1&limit=20`,
    { headers: jsonHeaders(), tags: { action: 'store' } },
  );

  check(res, { 'store: status ok': (r) => [200, 404].includes(r.status) });
}

export default function () {
  // Weighted random selection: 60% browse, 15% search, 10% auth, 10% stream, 5% store
  const rand = Math.random();

  if (rand < 0.60) {
    browsing();
  } else if (rand < 0.75) {
    searching();
  } else if (rand < 0.85) {
    authenticating();
  } else if (rand < 0.95) {
    streaming();
  } else {
    storeActivity();
  }

  sleep(Math.random() * 3 + 1);
}
