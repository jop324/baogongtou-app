import type { Worker, Attendance, ConstructionRecord, Expense, Overview, WorkerMonthlyStats } from './types';

// 在生产环境使用本地服务器，开发环境使用相对路径（通过Vite代理）
const API_BASE = import.meta.env.PROD ? 'http://localhost:3001/api' : '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || '请求失败');
  }
  return response.json();
}

// 工人管理
export const workerApi = {
  getAll: () => fetchJson<Worker[]>(`${API_BASE}/workers`),
  getById: (id: string) => fetchJson<Worker>(`${API_BASE}/workers/${id}`),
  create: (data: { name: string; jobType?: string; dailyRate?: number }) =>
    fetchJson<Worker>(`${API_BASE}/workers`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { name: string; jobType?: string; dailyRate?: number }) =>
    fetchJson<Worker>(`${API_BASE}/workers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/workers/${id}`, {
      method: 'DELETE',
    }),
};

// 考勤管理
export const attendanceApi = {
  getByMonth: (year: number, month: number) =>
    fetchJson<Attendance[]>(`${API_BASE}/attendance?year=${year}&month=${month}`),
  getStats: (year: number, month: number) =>
    fetchJson<WorkerMonthlyStats[]>(`${API_BASE}/attendance/stats?year=${year}&month=${month}`),
  getByWorker: (workerId: string, year: number, month: number) =>
    fetchJson<Attendance[]>(`${API_BASE}/attendance/worker/${workerId}?year=${year}&month=${month}`),
  set: (workerId: string, date: string, value: number) =>
    fetchJson<{ workerId: string; date: string; value: number }>(`${API_BASE}/attendance`, {
      method: 'POST',
      body: JSON.stringify({ workerId, date, value }),
    }),
  batchSet: (records: { workerId: string; date: string; value: number }[]) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/attendance/batch`, {
      method: 'POST',
      body: JSON.stringify({ records }),
    }),
};

// 施工记录
export const constructionApi = {
  getAll: (filters?: { workerId?: string; year?: number; month?: number }) => {
    const params = new URLSearchParams();
    if (filters?.workerId) params.append('workerId', filters.workerId);
    if (filters?.year) params.append('year', String(filters.year));
    if (filters?.month) params.append('month', String(filters.month));
    return fetchJson<ConstructionRecord[]>(`${API_BASE}/construction-records?${params}`);
  },
  getById: (id: string) => fetchJson<ConstructionRecord>(`${API_BASE}/construction-records/${id}`),
  create: (data: { date: string; workerIds: string[]; content: string; remark?: string }) =>
    fetchJson<ConstructionRecord>(`${API_BASE}/construction-records`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { date: string; workerIds: string[]; content: string; remark?: string }) =>
    fetchJson<ConstructionRecord>(`${API_BASE}/construction-records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/construction-records/${id}`, {
      method: 'DELETE',
    }),
};

// 支出记录
export const expenseApi = {
  getAll: (filters?: { workerId?: string; year?: number; month?: number; type?: string }) => {
    const params = new URLSearchParams();
    if (filters?.workerId) params.append('workerId', filters.workerId);
    if (filters?.year) params.append('year', String(filters.year));
    if (filters?.month) params.append('month', String(filters.month));
    if (filters?.type) params.append('type', filters.type);
    return fetchJson<Expense[]>(`${API_BASE}/expenses?${params}`);
  },
  getStats: (year: number, month: number) =>
    fetchJson<{ totalLiving: number; totalWage: number }>(`${API_BASE}/expenses/stats?year=${year}&month=${month}`),
  getByWorker: (workerId: string, year: number, month: number) =>
    fetchJson<Expense[]>(`${API_BASE}/expenses/worker/${workerId}?year=${year}&month=${month}`),
  getWorkerStats: (workerId: string, year: number, month: number) =>
    fetchJson<{ totalLiving: number; totalWage: number }>(`${API_BASE}/expenses/worker/${workerId}/stats?year=${year}&month=${month}`),
  create: (data: { date: string; workerId: string; type: string; amount: number; remark?: string }) =>
    fetchJson<Expense>(`${API_BASE}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { date: string; workerId: string; type: string; amount: number; remark?: string }) =>
    fetchJson<Expense>(`${API_BASE}/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE',
    }),
};

// 概览
export const overviewApi = {
  get: (year?: number, month?: number) =>
    fetchJson<Overview>(`${API_BASE}/overview?year=${year || ''}&month=${month || ''}`),
};
