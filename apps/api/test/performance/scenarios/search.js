import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, strictThresholds, jsonHeaders, rampingStages } from '../k6-config.js';

export const options = {
  scenarios: {
    search: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: rampingStages(100),
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    ...strictThresholds,
    'http_req_duration{endpoint:search}': ['p(95)<300'],
  },
};

const SEARCH_TERMS = [
  'сериал',
  'комедия',
  'экшн',
  'драма',
  'фантастика',
  'ужасы',
  'документальный',
  'мультфильм',
  'тренировка',
  'урок',
  'кулинария',
  'путешествия',
  'наука',
  'история',
  'спорт',
];

export default function () {
  const query = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  const page = Math.floor(Math.random() * 3) + 1;

  const res = http.get(
    `${BASE_URL}/content/search?q=${encodeURIComponent(query)}&page=${page}&limit=20`,
    { headers: jsonHeaders(), tags: { endpoint: 'search' } },
  );

  check(res, {
    'search: status 200': (r) => r.status === 200,
    'search: has results structure': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined;
      } catch {
        return false;
      }
    },
    'search: response time < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(Math.random() * 2 + 1);
}
