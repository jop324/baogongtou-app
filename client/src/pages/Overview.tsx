import { useState, useEffect } from 'react';
import { overviewApi } from '../api';
import type { Overview as OverviewType } from '../types';
import dayjs from 'dayjs';

export default function Overview() {
  const [data, setData] = useState<OverviewType | null>(null);
  const [loading, setLoading] = useState(true);

  const currentYear = dayjs().year();
  const currentMonth = dayjs().month() + 1;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await overviewApi.get(currentYear, currentMonth);
      setData(result);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">📊 数据概览</h1>
      
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          {data?.year}年{data?.month}月统计
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{data?.totalWorkers}</div>
            <div className="text-sm text-gray-600">在岗工人</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{data?.totalWorkDays}</div>
            <div className="text-sm text-gray-600">本月工日</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">¥{data?.totalLivingExpense}</div>
            <div className="text-sm text-gray-600">本月预支</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-red-600">¥{data?.totalWage}</div>
            <div className="text-sm text-gray-600">本月工资</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">💡 快捷操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <a href="/workers" className="block p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-center">
            <div className="text-2xl mb-1">👷</div>
            <div className="text-sm font-medium text-blue-700">管理工人</div>
          </a>
          <a href="/attendance" className="block p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-center">
            <div className="text-2xl mb-1">📅</div>
            <div className="text-sm font-medium text-green-700">录入考勤</div>
          </a>
          <a href="/construction" className="block p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-center">
            <div className="text-2xl mb-1">🏗️</div>
            <div className="text-sm font-medium text-purple-700">施工记录</div>
          </a>
          <a href="/expenses" className="block p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-center">
            <div className="text-2xl mb-1">💰</div>
            <div className="text-sm font-medium text-orange-700">支出记录</div>
          </a>
          <a href="/statistics" className="block p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors text-center">
            <div className="text-2xl mb-1">📈</div>
            <div className="text-sm font-medium text-indigo-700">统计查询</div>
          </a>
          <a href="/export" className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center">
            <div className="text-2xl mb-1">📤</div>
            <div className="text-sm font-medium text-gray-700">导出数据</div>
          </a>
        </div>
      </div>
    </div>
  );
}
