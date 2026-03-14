import { useState, useEffect } from 'react';
import { expenseApi, workerApi } from '../api';
import type { Expense, Worker } from '../types';

const EXPENSE_TYPES = [
  { value: 'living_expense', label: '生活费' },
  { value: 'wage', label: '工资' },
];

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [filterWorker, setFilterWorker] = useState('');
  const [filterType, setFilterType] = useState('');
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    workerId: '',
    type: 'living_expense',
    amount: '',
    remark: '',
  });

  useEffect(() => {
    loadWorkers();
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [year, month, filterWorker, filterType]);

  const loadWorkers = async () => {
    try {
      const data = await workerApi.getAll();
      setWorkers(data);
    } catch (error) {
      console.error('加载工人失败:', error);
    }
  };

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const filters: { workerId?: string; year: number; month: number; type?: string } = {
        year,
        month,
      };
      if (filterWorker) filters.workerId = filterWorker;
      if (filterType) filters.type = filterType;
      
      const data = await expenseApi.getAll(filters);
      setExpenses(data);
    } catch (error) {
      console.error('加载支出记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        date: formData.date,
        workerId: formData.workerId,
        type: formData.type,
        amount: Number(formData.amount),
        remark: formData.remark || undefined,
      };
      
      if (editingExpense) {
        await expenseApi.update(editingExpense.id, data);
      } else {
        await expenseApi.create(data);
      }
      
      setShowModal(false);
      setEditingExpense(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        workerId: '',
        type: 'living_expense',
        amount: '',
        remark: '',
      });
      loadExpenses();
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date,
      workerId: expense.workerId,
      type: expense.type,
      amount: expense.amount.toString(),
      remark: expense.remark || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该支出记录吗？')) return;
    try {
      await expenseApi.delete(id);
      loadExpenses();
    } catch (error) {
      alert('删除失败');
    }
  };

  const getWorkerName = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    return worker?.name || workerId;
  };

  const getTypeLabel = (type: string) => {
    return EXPENSE_TYPES.find(t => t.value === type)?.label || type;
  };

  const totalLiving = expenses
    .filter(e => e.type === 'living_expense')
    .reduce((sum, e) => sum + e.amount, 0);
  
  const totalWage = expenses
    .filter(e => e.type === 'wage')
    .reduce((sum, e) => sum + e.amount, 0);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">💰 支出记录</h1>
        <button
          onClick={() => {
            setEditingExpense(null);
            setFormData({
              date: new Date().toISOString().split('T')[0],
              workerId: workers[0]?.id || '',
              type: 'living_expense',
              amount: '',
              remark: '',
            });
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 新增支出
        </button>
      </div>

      {/* 筛选条件 */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">年份：</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map(m => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">工人：</label>
            <select
              value={filterWorker}
              onChange={(e) => setFilterWorker(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部</option>
              {workers.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">类型：</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部</option>
              {EXPENSE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* 统计 */}
        <div className="mt-4 pt-4 border-t flex flex-wrap gap-6">
          <div className="text-sm">
            <span className="text-gray-600">生活费合计：</span>
            <span className="font-semibold text-orange-600">¥{totalLiving.toLocaleString()}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-600">工资合计：</span>
            <span className="font-semibold text-green-600">¥{totalWage.toLocaleString()}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-600">总计：</span>
            <span className="font-semibold text-gray-800">¥{(totalLiving + totalWage).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 支出列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">日期</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">工人</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">类型</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">金额(元)</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">备注</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">加载中...</td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">暂无支出记录</td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{expense.date}</td>
                    <td className="px-4 py-3 font-medium">{expense.workerName || getWorkerName(expense.workerId)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        expense.type === 'living_expense' 
                          ? 'bg-orange-100 text-orange-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {getTypeLabel(expense.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{expense.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{expense.remark || '-'}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(expense)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">
                {editingExpense ? '编辑支出' : '新增支出'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  工人 <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.workerId}
                  onChange={(e) => setFormData({ ...formData, workerId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择工人</option>
                  {workers.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  类型 <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {EXPENSE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  金额(元) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入金额"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="可选填写"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingExpense(null);
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
