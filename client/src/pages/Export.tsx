import { useState, useEffect } from 'react';
import { workerApi, attendanceApi, expenseApi, overviewApi } from '../api';
import type { Worker, Attendance, Expense, Overview, WorkerMonthlyStats } from '../types';

type ExportType = 'workers' | 'attendance' | 'expenses' | 'summary';

export default function Export() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [exportType, setExportType] = useState<ExportType>('summary');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [workerStats, setWorkerStats] = useState<WorkerMonthlyStats[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    loadData();
  }, [year, month]);

  const loadData = async () => {
    try {
      const [workersData, attendanceData, expensesData, statsData, overviewData] = await Promise.all([
        workerApi.getAll(),
        attendanceApi.getByMonth(year, month),
        expenseApi.getAll({ year, month }),
        attendanceApi.getStats(year, month),
        overviewApi.get(year, month),
      ]);
      
      setWorkers(workersData);
      setAttendance(attendanceData);
      setExpenses(expensesData);
      setWorkerStats(statsData);
      setOverview(overviewData);
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  // 简单的 Excel 导出函数（不依赖外部库）
  const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) {
      setMessage({ type: 'error', text: '没有数据可导出' });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // 处理包含逗号或换行的值
          if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        }).join(',')
      )
    ].join('\n');

    // 添加 BOM 以支持中文
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${year}年${month}月.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setMessage({ type: 'success', text: '导出成功！' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExport = async () => {
    setLoading(true);
    setMessage(null);

    try {
      switch (exportType) {
        case 'workers':
          exportWorkers();
          break;
        case 'attendance':
          exportAttendance();
          break;
        case 'expenses':
          exportExpenses();
          break;
        case 'summary':
          exportSummary();
          break;
      }
    } catch (error) {
      setMessage({ type: 'error', text: '导出失败，请重试' });
    } finally {
      setLoading(false);
    }
  };

  const exportWorkers = () => {
    const data = workers.map(w => ({
      姓名: w.name,
      工种: w.jobType || '',
      日薪: w.dailyRate || '',
      状态: w.status === 'active' ? '在职' : '离职',
      创建时间: w.createdAt.split('T')[0],
    }));
    exportToCSV(data, '工人信息');
  };

  const exportAttendance = () => {
    const data = attendance.map(a => ({
      日期: a.date,
      姓名: a.workerName,
      工种: a.jobType || '',
      工价: a.dailyRate || '',
      出勤: a.value,
    }));
    exportToCSV(data, '考勤记录');
  };

  const exportExpenses = () => {
    const data = expenses.map(e => ({
      日期: e.date,
      姓名: e.workerName,
      类型: e.type === 'living_expense' ? '生活费' : '工资',
      金额: e.amount,
      备注: e.remark || '',
    }));
    exportToCSV(data, '支出记录');
  };

  const exportSummary = () => {
    const data = workerStats.map(stat => {
      const worker = workers.find(w => w.id === stat.id);
      const dailyRate = stat.dailyRate || worker?.dailyRate || 0;
      const wageEarned = stat.totalDays * dailyRate;
      
      return {
        姓名: stat.name,
        工种: stat.jobType || '',
        日薪: dailyRate,
        出勤天数: stat.totalDays || 0,
        应收工资: wageEarned,
        生活费: stat.totalLiving || 0,
        工资: stat.totalWage || 0,
        合计支出: (stat.totalLiving || 0) + (stat.totalWage || 0),
      };
    });

    // 添加合计行
    const totalDays = workerStats.reduce((sum, w) => sum + (w.totalDays || 0), 0);
    const totalWageEarned = workerStats.reduce((sum, w) => {
      const worker = workers.find(ww => ww.id === w.id);
      const dailyRate = w.dailyRate || worker?.dailyRate || 0;
      return sum + (w.totalDays || 0) * dailyRate;
    }, 0);
    const totalLiving = workerStats.reduce((sum, w) => sum + (w.totalLiving || 0), 0);
    const totalWage = workerStats.reduce((sum, w) => sum + (w.totalWage || 0), 0);

    data.push({
      姓名: '合计',
      工种: '',
      日薪: '',
      出勤天数: totalDays,
      应收工资: totalWageEarned,
      生活费: totalLiving,
      工资: totalWage,
      合计支出: totalLiving + totalWage,
    });

    exportToCSV(data, '月度汇总表');
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">📤 导出中心</h1>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 导出选项 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">导出选项</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">选择年份</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">选择月份</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map(m => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">导出类型</label>
            <div className="space-y-2">
              {[
                { value: 'summary', label: '月度汇总表', desc: '包含工人出勤、工资、生活费汇总' },
                { value: 'workers', label: '工人信息', desc: '所有工人基本信息' },
                { value: 'attendance', label: '考勤记录', desc: '指定月份的每日考勤明细' },
                { value: 'expenses', label: '支出记录', desc: '指定月份的生活费、工资发放记录' },
              ].map((item) => (
                <label
                  key={item.value}
                  className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                    exportType === item.value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportType"
                    value={item.value}
                    checked={exportType === item.value}
                    onChange={(e) => setExportType(e.target.value as ExportType)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="text-sm text-gray-500">{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-medium transition-colors ${
              loading 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? '导出中...' : '导出 CSV 文件'}
          </button>
        </div>

        {/* 数据预览 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            数据预览 - {year}年{month}月
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">工人总数</div>
              <div className="text-2xl font-bold text-blue-600">{workers.length}</div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">考勤记录</div>
              <div className="text-2xl font-bold text-green-600">{attendance.length} 条</div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">支出记录</div>
              <div className="text-2xl font-bold text-orange-600">{expenses.length} 条</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-sm text-orange-600">生活费合计</div>
                <div className="text-xl font-bold text-orange-700">
                  ¥{(overview?.totalLivingExpense || 0).toLocaleString()}
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-green-600">工资合计</div>
                <div className="text-xl font-bold text-green-700">
                  ¥{(overview?.totalWage || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
            <p className="font-semibold mb-1">导出说明：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>导出的文件格式为 CSV，可用 Excel 打开</li>
              <li>文件会自动命名为「类型_年月.csv」</li>
              <li>建议使用 Microsoft Excel 或 WPS 打开</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
