export interface Worker {
  id: string;
  name: string;
  jobType?: string;
  dailyRate?: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Attendance {
  id: string;
  workerId: string;
  workerName?: string;
  jobType?: string;
  dailyRate?: number;
  date: string;
  value: number;
}

export interface ConstructionRecord {
  id: string;
  date: string;
  workerIds: string[];
  workerNames?: string;
  content: string;
  remark?: string;
  images?: string[];
}

export interface Expense {
  id: string;
  date: string;
  workerId: string;
  workerName?: string;
  type: 'living_expense' | 'wage';
  amount: number;
  remark?: string;
}

export interface Overview {
  totalWorkers: number;
  totalWorkDays: number;
  totalLivingExpense: number;
  totalWage: number;
  totalExpense: number;
  year: number;
  month: number;
}

export interface WorkerMonthlyStats {
  id: string;
  name: string;
  jobType?: string;
  dailyRate?: number;
  totalDays: number;
  totalLiving: number;
  totalWage: number;
}
