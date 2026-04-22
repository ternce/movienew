import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, strictThresholds, jsonHeaders, rampingStages } from '../k6-config.js';

export const options = {
  scenarios: {
    content_listing: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: rampingStages(100),
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    ...strictThresholds,
    'http_req_duration{endpoint:content_list}': ['p(95)<200'],
    'http_req_duration{endpoint:content_slug}': ['p(95)<300'],
    'http_req_duration{endpoint:categories}': ['p(95)<150'],
  },
};

const CONTENT_TYPES = ['SERIES', 'CLIP', 'SHORT', 'TUTORIAL'];
const PAGES = [1, 2, 3, 4, 5];

export default function () {
  // 1. List content with pagination
  const contentType = CONTENT_TYPES[Math.floor(Math.random() * CONTENT_TYPES.length)];
  const page = PAGES[Math.floor(Math.random() * PAGES.length)];

  const listRes = http.get(
    `${BASE_URL}/content?type=${contentType}&page=${page}&limit=20`,
    { headers: jsonHeaders(), tags: { endpoint: 'content_list' } },
  );

  check(listRes, {
    'content list: status 200': (r) => r.status === 200,
    'content list: has items': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && Array.isArray(body.data.items);
      } catch {
        return false;
      }
    },
  });

  sleep(Math.random() * 2 + 0.5);

  // 2. Get content by slug (simulate clicking on an item)
  const slugRes = http.get(
    `${BASE_URL}/content/test-content-slug`,
    { headers: jsonHeaders(), tags: { endpoint: 'content_slug' } },
  );

  check(slugRes, {
    'content slug: status 200 or 404': (r) => [200, 404].includes(r.status),
  });

  sleep(Math.random() * 1 + 0.5);

  // 3. Get categories
  const catRes = http.get(
    `${BASE_URL}/content/categories`,
    { headers: jsonHeaders(), tags: { endpoint: 'categories' } },
  );

  check(catRes, {
    'categories: status 200': (r) => r.status === 200,
  });

  sleep(Math.random() * 1 + 0.5);
}
