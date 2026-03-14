import { useState, useEffect } from 'react';
import { attendanceApi, workerApi } from '../api';
import type { Worker, WorkerMonthlyStats } from '../types';
import dayjs from 'dayjs';

const ATTENDANCE_VALUES = [
  { value: 1, label: '1天', color: 'bg-green-500' },
  { value: 0.5, label: '半天', color: 'bg-yellow-500' },
  { value: 1.5, label: '1天+', color: 'bg-blue-500' },
  { value: 0, label: '缺勤', color: 'bg-red-500' },
];

export default function Attendance() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [stats, setStats] = useState<WorkerMonthlyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedValue, setSelectedValue] = useState(1);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [year, setYear] = useState(dayjs().year());
  const [month, setMonth] = useState(dayjs().month() + 1);
  const [mode, setMode] = useState<'quick' | 'month'>('quick');
  const [monthlyData, setMonthlyData] = useState<Record<string, Record<string, number>>>({});
  const [viewWeek, setViewWeek] = useState(1); // 周视图：1-5周

  useEffect(() => {
    loadWorkers();
  }, []);

  useEffect(() => {
    loadStats();
    if (mode === 'month') {
      loadMonthlyData();
    }
  }, [year, month, mode]);

  const loadWorkers = async () => {
    try {
      const data = await workerApi.getAll();
      setWorkers(data);
    } catch (error) {
      console.error('加载工人失败:', error);
    }
  };

  const loadStats = async () => {
    try {
      const data = await attendanceApi.getStats(year, month);
      setStats(data);
    } catch (error) {
      console.error('加载统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyData = async () => {
    try {
      const data = await attendanceApi.getByMonth(year, month);
      const grouped: Record<string, Record<string, number>> = {};
      
      (data as Array<{ workerId: string; date: string; value: number }>).forEach(item => {
        if (!grouped[item.workerId]) {
          grouped[item.workerId] = {};
        }
        grouped[item.workerId][item.date] = item.value;
      });
      
      setMonthlyData(grouped);
    } catch (error) {
      console.error('加载月度数据失败:', error);
    }
  };

  const handleQuickSet = async () => {
    if (selectedWorkers.length === 0) {
      alert('请选择工人');
      return;
    }
    try {
      const records = selectedWorkers.map(workerId => ({
        workerId,
        date: selectedDate,
        value: selectedValue,
      }));
      await attendanceApi.batchSet(records);
      alert('考勤录入成功');
      setSelectedWorkers([]);
      loadStats();
    } catch (error) {
      alert('录入失败');
    }
  };

  const handleMonthCellChange = async (workerId: string, date: string, value: number) => {
    try {
      await attendanceApi.set(workerId, date, value);
      setMonthlyData(prev => ({
        ...prev,
        [workerId]: {
          ...prev[workerId],
          [date]: value,
        }
      }));
      loadStats();
    } catch (error) {
      alert('设置失败');
    }
  };

  const getDaysInMonth = () => {
    return dayjs(`${year}-${month}-01`).daysInMonth();
  };

  const formatDate = (day: number) => {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // 获取某周的开始和结束日期
  const getWeekRange = (week: number) => {
    const daysInMonth = getDaysInMonth();
    const startDay = (week - 1) * 7 + 1;
    const endDay = Math.min(week * 7, daysInMonth);
    return { startDay, endDay, days: endDay - startDay + 1 };
  };

  // 获取周显示标签
  const getWeekLabel = (week: number) => {
    const { startDay, endDay } = getWeekRange(week);
    return `第${week}周 (${startDay}-${endDay}日)`;
  };

  const getValueColor = (value: number) => {
    const found = ATTENDANCE_VALUES.find(v => v.value === value);
    return found ? found.color : 'bg-gray-200';
  };

  const toggleWorkerSelection = (workerId: string) => {
    setSelectedWorkers(prev => 
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">📅 考勤管理</h1>

      {/* 月份选择 */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center space-x-2">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg text-sm sm:text-base"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg text-sm sm:text-base"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setMode('quick')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm ${
                mode === 'quick' ? 'bg-blue-600 text-white' : 'bg-gray-100'
              }`}
            >
              快速录入
            </button>
            <button
              onClick={() => setMode('month')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm ${
                mode === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100'
              }`}
            >
              月度表格
            </button>
          </div>
        </div>
      </div>

      {/* 快速录入模式 */}
      {mode === 'quick' && (
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4">
          <h3 className="font-semibold text-gray-700 mb-3 sm:mb-4">快速单日录入</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">考勤值</label>
              <select
                value={selectedValue}
                onChange={(e) => setSelectedValue(Number(e.target.value))}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg text-sm sm:text-base"
              >
                {ATTENDANCE_VALUES.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleQuickSet}
                className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
              >
                确认录入
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择工人</label>
            <div className="flex flex-wrap gap-2">
              {workers.map((worker) => (
                <button
                  key={worker.id}
                  onClick={() => toggleWorkerSelection(worker.id)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedWorkers.includes(worker.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {worker.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 月度表格模式 */}
      {mode === 'month' && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
          {/* 视图切换 */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-gray-50 border-b">
            <span className="text-sm text-gray-600">查看方式：</span>
            <div className="flex rounded-lg overflow-hidden border">
              {[1, 2, 3, 4, 5].filter(w => w <= Math.ceil(getDaysInMonth() / 7)).map(week => (
                <button
                  key={week}
                  onClick={() => setViewWeek(week)}
                  className={`px-3 py-1.5 text-sm ${
                    viewWeek === week
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {week}周
                </button>
              ))}
            </div>
            <button
              onClick={() => setViewWeek(0)} // 0 表示全月视图
              className={`px-3 py-1.5 text-sm rounded-lg ${
                viewWeek === 0
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              全月
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left font-medium sticky left-0 bg-gray-50 z-10">工人</th>
                  <th className="px-2 py-2 text-center font-medium sticky left-16 bg-gray-50 z-10">工种</th>
                  {viewWeek === 0 ? (
                    // 全月视图：紧凑显示
                    Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map(day => (
                      <th key={day} className={`px-0.5 py-2 text-center text-xs font-medium w-5 ${day % 7 === 1 ? 'bg-blue-50' : ''}`}>
                        <span className="block text-[10px] text-gray-400">{day}</span>
                      </th>
                    ))
                  ) : (
                    // 周视图：更宽松的显示
                    Array.from({ length: getWeekRange(viewWeek).days }, (_, i) => getWeekRange(viewWeek).startDay + i).map(day => (
                      <th key={day} className="px-1 py-2 text-center text-xs font-medium w-8">
                        <div className="flex flex-col">
                          <span>{day}</span>
                          <span className="text-[10px] text-gray-400">
                            {['日', '一', '二', '三', '四', '五', '六'][dayjs(formatDate(day)).day()]}
                          </span>
                        </div>
                      </th>
                    ))
                  )}
                  <th className="px-2 py-2 text-center font-medium bg-yellow-50 sticky right-0 z-10">合计</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((worker) => (
                  <tr key={worker.id} className="border-t hover:bg-gray-50">
                    <td className="px-2 py-2 font-medium sticky left-0 bg-white z-10">{worker.name}</td>
                    <td className="px-2 py-2 text-center text-gray-600 sticky left-16 bg-white z-10">{worker.jobType || '-'}</td>
                    {viewWeek === 0 ? (
                      // 全月视图
                      Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map(day => {
                        const date = formatDate(day);
                        const value = monthlyData[worker.id]?.[date] ?? '';
                        return (
                          <td key={day} className={`px-0.5 py-1 text-center ${day % 7 === 1 ? 'bg-blue-50/30' : ''}`}>
                            {value !== '' ? (
                              <div className={`w-5 h-5 mx-auto rounded text-[8px] flex items-center justify-center text-white ${getValueColor(Number(value))}`}>
                                {value}
                              </div>
                            ) : (
                              <div className="w-5 h-5 mx-auto rounded border border-gray-200"></div>
                            )}
                          </td>
                        );
                      })
                    ) : (
                      // 周视图
                      Array.from({ length: getWeekRange(viewWeek).days }, (_, i) => getWeekRange(viewWeek).startDay + i).map(day => {
                        const date = formatDate(day);
                        const value = monthlyData[worker.id]?.[date] ?? '';
                        const dayOfWeek = dayjs(date).day();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        return (
                          <td key={day} className={`px-1 py-1 text-center ${isWeekend ? 'bg-red-50' : ''}`}>
                            <select
                              value={value}
                              onChange={(e) => handleMonthCellChange(worker.id, date, Number(e.target.value))}
                              className={`w-10 h-8 text-xs border rounded text-center cursor-pointer ${getValueColor(Number(value) || 0)}`}
                            >
                              <option value=""></option>
                              {ATTENDANCE_VALUES.map(v => (
                                <option key={v.value} value={v.value}>{v.label}</option>
                              ))}
                            </select>
                          </td>
                        );
                      })
                    )}
                    <td className="px-2 py-2 text-center font-bold bg-yellow-50 sticky right-0 z-10">
                      {stats.find(s => s.id === worker.id)?.totalDays || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 考勤统计 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-sm font-medium text-gray-600">工人</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-sm font-medium text-gray-600">工种</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-sm font-medium text-gray-600">工价(元/天)</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-sm font-medium text-gray-600">本月工日</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-sm font-medium text-gray-600">应发工资(元)</th>
              </tr>
            </thead>
            <tbody>
              {stats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 sm:py-8 text-center text-gray-500">
                    暂无考勤数据
                  </td>
                </tr>
              ) : (
                stats.map((stat) => (
                  <tr key={stat.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 sm:px-4 py-2 sm:py-3 font-medium text-sm">{stat.name}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-600 text-sm">{stat.jobType || '-'}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-right text-gray-600 text-sm">{stat.dailyRate || '-'}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-right font-bold text-green-600 text-sm">{stat.totalDays}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-right font-bold text-blue-600 text-sm">
                      {stat.dailyRate ? (stat.totalDays * stat.dailyRate).toFixed(2) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={3} className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-right text-sm">本月合计</td>
                <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold text-right text-green-600 text-sm">
                  {stats.reduce((sum, s) => sum + (s.totalDays || 0), 0)}
                </td>
                <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold text-right text-blue-600 text-sm">
                  {stats.reduce((sum, s) => sum + ((s.totalDays || 0) * (s.dailyRate || 0)), 0).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
