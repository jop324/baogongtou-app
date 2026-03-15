import { useState, useEffect } from 'react';
import { attendanceApi, expenseApi, workerApi, overviewApi } from '../api';
import type { WorkerMonthlyStats, Worker, Overview } from '../types';

export default function Statistics() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [workerStats, setWorkerStats] = useState<WorkerMonthlyStats[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkers();
  }, []);

  useEffect(() => {
    loadStats();
  }, [year, month]);

  const loadWorkers = async () => {
    try {
      const data = await workerApi.getAll();
      setWorkers(data);
    } catch (error) {
      console.error('加载工人失败:', error);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      // 获取考勤统计
      const statsData = await attendanceApi.getStats(year, month);
      
      // 获取每个工人的支出统计
      const workersData = await workerApi.getAll();
      const activeWorkers = workersData.filter(w => w.status === 'active');
      
      // 并行获取所有工人的支出数据
      const expensePromises = activeWorkers.map(async (worker) => {
        try {
          const expenseStats = await expenseApi.getWorkerStats(worker.id, year, month);
          return { workerId: worker.id, ...expenseStats };
        } catch {
          return { workerId: worker.id, totalLiving: 0, totalWage: 0 };
        }
      });
      
      const expenseResults = await Promise.all(expensePromises);
      const expenseMap = new Map(expenseResults.map(e => [e.workerId, e]));
      
      // 合并考勤和支出数据
      const mergedStats = statsData.map(stat => {
        const expenseData = expenseMap.get(stat.id) || { totalLiving: 0, totalWage: 0 };
        return {
          ...stat,
          totalLiving: expenseData.totalLiving,
          totalWage: expenseData.totalWage,
        };
      });
      
      setWorkerStats(mergedStats);

      // 获取概览数据
      const overviewData = await overviewApi.get(year, month);
      setOverview(overviewData);
    } catch (error) {
      console.error('加载统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // 计算总计
  const totalDays = workerStats.reduce((sum, w) => sum + (w.totalDays || 0), 0);
  const totalLiving = workerStats.reduce((sum, w) => sum + (w.totalLiving || 0), 0);
  const totalWage = workerStats.reduce((sum, w) => sum + (w.totalWage || 0), 0);
  const totalWageEarned = workerStats.reduce((sum, w) => {
    const worker = workers.find(ww => ww.id === w.id);
    const dailyRate = w.dailyRate || worker?.dailyRate || 0;
    return sum + (w.totalDays || 0) * dailyRate;
  }, 0);
  const totalRemainingWage = totalWageEarned - totalLiving - totalWage;

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">📈 统计查询</h1>

      {/* 筛选条件 */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-wrap gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">年份：</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">月份：</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            >
              {months.map(m => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 月度概览卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white rounded-lg shadow p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">在职工人</div>
          <div className="text-xl sm:text-2xl font-bold text-blue-600">{overview?.totalWorkers || 0}</div>
          <div className="text-xs text-gray-400">人</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">总工日</div>
          <div className="text-xl sm:text-2xl font-bold text-green-600">{overview?.totalWorkDays || 0}</div>
          <div className="text-xs text-gray-400">天</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">生活费支出</div>
          <div className="text-lg sm:text-2xl font-bold text-orange-500">¥{(overview?.totalLivingExpense || 0).toLocaleString()}</div>
          <div className="text-xs text-gray-400">元</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">工资支出</div>
          <div className="text-lg sm:text-2xl font-bold text-green-500">¥{(overview?.totalWage || 0).toLocaleString()}</div>
          <div className="text-xs text-gray-400">元</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 col-span-2 sm:col-span-3 lg:col-span-1">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">总支出</div>
          <div className="text-lg sm:text-2xl font-bold text-gray-800">¥{(overview?.totalExpense || 0).toLocaleString()}</div>
          <div className="text-xs text-gray-400">元</div>
        </div>
      </div>

      {/* 工人明细统计 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-3 sm:px-4 py-2 sm:py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{year}年{month}月 工人明细统计</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-600">工人姓名</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-600">工种</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-600">工价(元/天)</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-medium text-gray-600">出勤天数</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-medium text-gray-600">生活费</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-medium text-gray-600">工资</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-medium text-gray-600">小计</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-medium text-gray-600">剩余工钱</th>
              </tr>
            </thead>
            <tbody>
              {workerStats.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 sm:py-8 text-center text-gray-500 text-sm">暂无统计数据</td>
                </tr>
              ) : (
                workerStats.map((stat) => {
                  const worker = workers.find(w => w.id === stat.id);
                  const dailyRate = stat.dailyRate || worker?.dailyRate || 0;
                  const wageEarned = stat.totalDays * dailyRate;
                  const totalExpense = (stat.totalLiving || 0) + (stat.totalWage || 0);
                  const remainingWage = wageEarned - totalExpense;
                  
                  return (
                    <tr key={stat.id} className="border-t hover:bg-gray-50">
                      <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-sm">{stat.name}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600 text-sm">{stat.jobType || '-'}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600 text-sm">{dailyRate}元/天</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium text-sm">{stat.totalDays || 0}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-orange-600 text-sm">¥{(stat.totalLiving || 0).toLocaleString()}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-green-600 text-sm">¥{(stat.totalWage || 0).toLocaleString()}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-bold text-gray-800 text-sm">¥{totalExpense.toLocaleString()}</td>
                      <td className={`px-2 sm:px-4 py-2 sm:py-3 text-right font-bold text-sm ${remainingWage >= 0 ? 'text-blue-600' : 'text-red-600'}`}>¥{remainingWage.toLocaleString()}</td>
                    </tr>
                  );
                })
              )}
              {/* 合计行 */}
              {workerStats.length > 0 && (
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-2 sm:px-4 py-2 sm:py-3" colSpan={3}>合计</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-sm">{totalDays}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-orange-600 text-sm">¥{totalLiving.toLocaleString()}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-green-600 text-sm">¥{totalWage.toLocaleString()}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-gray-800 text-sm">¥{(totalLiving + totalWage).toLocaleString()}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-blue-600 text-sm">¥{totalRemainingWage.toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 说明 */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
        <p className="font-semibold mb-1">统计说明：</p>
        <ul className="list-disc list-inside space-y-1">
          <li>出勤天数：按该工人当月考勤记录汇总</li>
          <li>工资 = 出勤天数 × 日薪（工价）</li>
          <li>生活费、工资支出：按实际发放记录统计</li>
        </ul>
      </div>
    </div>
  );
}
