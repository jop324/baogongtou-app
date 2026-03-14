import { useState, useEffect } from 'react';
import { constructionApi, workerApi } from '../api';
import type { Worker, ConstructionRecord } from '../types';
import dayjs from 'dayjs';

export default function Construction() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [records, setRecords] = useState<ConstructionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ConstructionRecord | null>(null);
  const [filters, setFilters] = useState({
    workerId: '',
    year: dayjs().year(),
    month: dayjs().month() + 1,
  });
  const [formData, setFormData] = useState({
    date: dayjs().format('YYYY-MM-DD'),
    workerIds: [] as string[],
    content: '',
    remark: '',
  });

  useEffect(() => {
    loadWorkers();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [filters]);

  const loadWorkers = async () => {
    try {
      const data = await workerApi.getAll();
      setWorkers(data);
    } catch (error) {
      console.error('加载工人失败:', error);
    }
  };

  const loadRecords = async () => {
    try {
      const data = await constructionApi.getAll({
        workerId: filters.workerId || undefined,
        year: filters.year,
        month: filters.month,
      });
      setRecords(data);
    } catch (error) {
      console.error('加载施工记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.workerIds.length === 0) {
      alert('请选择施工人员');
      return;
    }
    try {
      if (editingRecord) {
        await constructionApi.update(editingRecord.id, formData);
      } else {
        await constructionApi.create(formData);
      }
      setShowModal(false);
      setEditingRecord(null);
      setFormData({
        date: dayjs().format('YYYY-MM-DD'),
        workerIds: [],
        content: '',
        remark: '',
      });
      loadRecords();
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleEdit = async (record: ConstructionRecord) => {
    const fullRecord = await constructionApi.getById(record.id);
    setEditingRecord(fullRecord as ConstructionRecord);
    setFormData({
      date: (fullRecord as ConstructionRecord).date,
      workerIds: (fullRecord as ConstructionRecord).workerIds,
      content: (fullRecord as ConstructionRecord).content,
      remark: (fullRecord as ConstructionRecord).remark || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该记录吗？')) return;
    try {
      await constructionApi.delete(id);
      loadRecords();
    } catch (error) {
      alert('删除失败');
    }
  };

  const toggleWorkerSelection = (workerId: string) => {
    setFormData(prev => ({
      ...prev,
      workerIds: prev.workerIds.includes(workerId)
        ? prev.workerIds.filter(id => id !== workerId)
        : [...prev.workerIds, workerId]
    }));
  };

  const getWorkerNames = (workerIds: string[]) => {
    return workerIds
      .map(id => workers.find(w => w.id === id)?.name)
      .filter(Boolean)
      .join('、');
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">🏗️ 施工记录</h1>
        <button
          onClick={() => {
            setEditingRecord(null);
            setFormData({
              date: dayjs().format('YYYY-MM-DD'),
              workerIds: [],
              content: '',
              remark: '',
            });
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 新增记录
        </button>
      </div>

      {/* 筛选 */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <select
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: Number(e.target.value) })}
              className="px-3 py-2 border rounded-lg"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
            <select
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: Number(e.target.value) })}
              className="px-3 py-2 border rounded-lg"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
          </div>
          <select
            value={filters.workerId}
            onChange={(e) => setFilters({ ...filters, workerId: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">全部工人</option>
            {workers.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 记录列表 */}
      <div className="space-y-4">
        {records.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            暂无施工记录
          </div>
        ) : (
          records.map((record) => (
            <div key={record.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-sm text-gray-500">{record.date}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {record.workerIds.map(id => {
                      const worker = workers.find(w => w.id === id);
                      return worker ? (
                        <span key={id} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {worker.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(record)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(record.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    删除
                  </button>
                </div>
              </div>
              <div className="text-gray-800 mt-2">{record.content}</div>
              {record.remark && (
                <div className="text-gray-500 text-sm mt-1">备注: {record.remark}</div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">
                {editingRecord ? '编辑施工记录' : '新增施工记录'}
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
                  施工人员 <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {workers.map((worker) => (
                    <button
                      key={worker.id}
                      type="button"
                      onClick={() => toggleWorkerSelection(worker.id)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        formData.workerIds.includes(worker.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {worker.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  施工内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="请输入施工内容"
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
                  onClick={() => setShowModal(false)}
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
