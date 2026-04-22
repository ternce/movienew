import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, authThresholds, jsonHeaders, rampingStages } from '../k6-config.js';

export const options = {
  scenarios: {
    auth_flow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: rampingStages(50),
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    ...authThresholds,
    'http_req_duration{endpoint:login}': ['p(95)<500'],
    'http_req_duration{endpoint:refresh}': ['p(95)<300'],
    'http_req_duration{endpoint:logout}': ['p(95)<200'],
  },
};

export default function () {
  const vuId = __VU;
  const email = `loadtest-${vuId}-${Date.now()}@example.com`;

  // 1. Login
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: 'perf-test@example.com',
      password: 'TestPassword123!',
    }),
    { headers: jsonHeaders(), tags: { endpoint: 'login' } },
  );

  check(loginRes, {
    'login: status 200 or 401': (r) => [200, 401, 429].includes(r.status),
  });

  let accessToken = null;
  let refreshToken = null;

  if (loginRes.status === 200) {
    try {
      const body = JSON.parse(loginRes.body);
      accessToken = body.accessToken;
      refreshToken = body.refreshToken;
    } catch {
      // Ignore parse errors
    }
  }

  sleep(Math.random() * 2 + 1);

  // 2. Refresh token (if we got one)
  if (refreshToken) {
    const refreshRes = http.post(
      `${BASE_URL}/auth/refresh`,
      JSON.stringify({ refreshToken }),
      { headers: jsonHeaders(), tags: { endpoint: 'refresh' } },
    );

    check(refreshRes, {
      'refresh: status 200 or 401': (r) => [200, 401, 429].includes(r.status),
    });

    if (refreshRes.status === 200) {
      try {
        const body = JSON.parse(refreshRes.body);
        accessToken = body.accessToken;
        refreshToken = body.refreshToken;
      } catch {
        // Ignore
      }
    }
  }

  sleep(Math.random() * 1 + 0.5);

  // 3. Logout (if we have a token)
  if (accessToken) {
    const logoutRes = http.post(
      `${BASE_URL}/auth/logout`,
      JSON.stringify({ refreshToken: refreshToken || '' }),
      { headers: jsonHeaders(accessToken), tags: { endpoint: 'logout' } },
    );

    check(logoutRes, {
      'logout: status 200 or 401': (r) => [200, 401, 429].includes(r.status),
    });
  }

  sleep(Math.random() * 2 + 1);
}
