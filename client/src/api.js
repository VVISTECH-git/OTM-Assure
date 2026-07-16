const BASE = '/api';

function token() { return localStorage.getItem('otm_token') || ''; }

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(BASE + path, opts);
  if (r.status === 401) { localStorage.removeItem('otm_token'); window.location.href = '/login'; }
  return r.json();
}

export const api = {
  login: (email, password) => req('POST', '/auth/login', { email, password }),
  me: () => req('GET', '/auth/me'),

  instances: {
    list: () => req('GET', '/instances'),
    get: (id) => req('GET', `/instances/${id}`),
    create: (data) => req('POST', '/instances', data),
    update: (id, data) => req('PUT', `/instances/${id}`, data),
    delete: (id) => req('DELETE', `/instances/${id}`),
    testConnection: (id) => req('POST', `/instances/${id}/test-connection`),
  },

  scenarios: {
    list: () => req('GET', '/scenarios'),
    get: (id) => req('GET', `/scenarios/${id}`),
    create: (data) => req('POST', '/scenarios', data),
    update: (id, data) => req('PUT', `/scenarios/${id}`, data),
    delete: (id) => req('DELETE', `/scenarios/${id}`),
  },

  testdata: {
    get: (scenarioId, instanceId) => req('GET', `/testdata/${scenarioId}/${instanceId}`),
    save: (scenarioId, instanceId, pairs) => req('PUT', `/testdata/${scenarioId}/${instanceId}`, { pairs }),
    copy: (scenarioId, fromInstance, toInstance) => req('POST', '/testdata/copy', { scenarioId, fromInstance, toInstance }),
  },

  runs: {
    list: (params = {}) => req('GET', '/runs?' + new URLSearchParams(params)),
    get: (id) => req('GET', `/runs/${id}`),
    start: (instance_id, scenario_ids, triggered_by) => req('POST', '/runs', { instance_id, scenario_ids, triggered_by }),
    stop: (id) => req('POST', `/runs/${id}/stop`),
  },

  defects: {
    list: (params = {}) => req('GET', '/defects?' + new URLSearchParams(params)),
    get: (id) => req('GET', `/defects/${id}`),
    create: (data) => req('POST', '/defects', data),
    update: (id, data) => req('PUT', `/defects/${id}`, data),
    delete: (id) => req('DELETE', `/defects/${id}`),
  },

  users: {
    list: () => req('GET', '/users'),
    create: (data) => req('POST', '/users', data),
    update: (id, data) => req('PUT', `/users/${id}`, data),
    delete: (id) => req('DELETE', `/users/${id}`),
  },

  schedules: {
    list: () => req('GET', '/schedules'),
    create: (data) => req('POST', '/schedules', data),
    update: (id, data) => req('PUT', `/schedules/${id}`, data),
    delete: (id) => req('DELETE', `/schedules/${id}`),
  },

  reports: {
    scenarios: (params = {}) => req('GET', '/reports/scenarios?' + new URLSearchParams(params)),
    trend: (params = {}) => req('GET', '/reports/trend?' + new URLSearchParams(params)),
    summary: (params = {}) => req('GET', '/reports/summary?' + new URLSearchParams(params)),
    dashboard: (params = {}) => req('GET', '/reports/dashboard?' + new URLSearchParams(params)),
  },

  scenarioSteps: {
    list: (scenarioId) => req('GET', `/scenarios/${scenarioId}/steps`),
    save: (scenarioId, steps) => req('PUT', `/scenarios/${scenarioId}/steps`, { steps }),
  },
};
