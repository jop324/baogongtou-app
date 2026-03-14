const express = require('express');
const cors = require('cors');
const { 
  initDatabase, 
  workerModel, 
  attendanceModel, 
  constructionRecordModel, 
  expenseModel 
} = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// 初始化数据库
initDatabase();

app.use(cors());
app.use(express.json());

// 工人管理 API
app.get('/api/workers', (_req, res) => {
  try {
    const workers = workerModel.getAll();
    res.json(workers);
  } catch (error) {
    res.status(500).json({ error: '获取工人列表失败' });
  }
});

app.get('/api/workers/:id', (req, res) => {
  try {
    const worker = workerModel.getById(req.params.id);
    if (!worker) {
      return res.status(404).json({ error: '工人不存在' });
    }
    res.json(worker);
  } catch (error) {
    res.status(500).json({ error: '获取工人信息失败' });
  }
});

app.post('/api/workers', (req, res) => {
  try {
    const { name, jobType, dailyRate } = req.body;
    if (!name) {
      return res.status(400).json({ error: '姓名必填' });
    }
    const worker = workerModel.create(name, jobType, dailyRate);
    res.status(201).json(worker);
  } catch (error) {
    res.status(500).json({ error: '创建工人失败' });
  }
});

app.put('/api/workers/:id', (req, res) => {
  try {
    const { name, jobType, dailyRate } = req.body;
    if (!name) {
      return res.status(400).json({ error: '姓名必填' });
    }
    const worker = workerModel.update(req.params.id, name, jobType, dailyRate);
    res.json(worker);
  } catch (error) {
    res.status(500).json({ error: '更新工人失败' });
  }
});

app.delete('/api/workers/:id', (req, res) => {
  try {
    workerModel.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除工人失败' });
  }
});

// 考勤管理 API
app.get('/api/attendance', (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: '需要提供年份和月份' });
    }
    const attendance = attendanceModel.getByMonth(Number(year), Number(month));
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: '获取考勤记录失败' });
  }
});

app.get('/api/attendance/stats', (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: '需要提供年份和月份' });
    }
    const stats = attendanceModel.getMonthlyStats(Number(year), Number(month));
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: '获取考勤统计失败' });
  }
});

app.get('/api/attendance/worker/:workerId', (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: '需要提供年份和月份' });
    }
    const attendance = attendanceModel.getByWorkerAndMonth(
      req.params.workerId, 
      Number(year), 
      Number(month)
    );
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: '获取考勤记录失败' });
  }
});

app.post('/api/attendance', (req, res) => {
  try {
    const { workerId, date, value } = req.body;
    if (!workerId || !date || value === undefined) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    const result = attendanceModel.setAttendance(workerId, date, value);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: '设置考勤失败' });
  }
});

app.post('/api/attendance/batch', (req, res) => {
  try {
    const { records } = req.body;
    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: '需要提供记录数组' });
    }
    attendanceModel.batchSetAttendance(records);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '批量设置考勤失败' });
  }
});

// 施工记录 API
app.get('/api/construction-records', (req, res) => {
  try {
    const { workerId, year, month } = req.query;
    const filters = {};
    if (workerId) filters.workerId = workerId;
    if (year) filters.year = Number(year);
    if (month) filters.month = Number(month);
    
    const records = constructionRecordModel.getAll(
      Object.keys(filters).length > 0 ? filters : undefined
    );
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: '获取施工记录失败' });
  }
});

app.get('/api/construction-records/:id', (req, res) => {
  try {
    const record = constructionRecordModel.getById(req.params.id);
    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: '获取施工记录失败' });
  }
});

app.post('/api/construction-records', (req, res) => {
  try {
    const { date, workerIds, content, remark } = req.body;
    if (!date || !workerIds || !content) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    const record = constructionRecordModel.create(date, workerIds, content, remark);
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: '创建施工记录失败' });
  }
});

app.put('/api/construction-records/:id', (req, res) => {
  try {
    const { date, workerIds, content, remark } = req.body;
    if (!date || !workerIds || !content) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    const record = constructionRecordModel.update(req.params.id, date, workerIds, content, remark);
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: '更新施工记录失败' });
  }
});

app.delete('/api/construction-records/:id', (req, res) => {
  try {
    constructionRecordModel.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除施工记录失败' });
  }
});

// 支出记录 API
app.get('/api/expenses', (req, res) => {
  try {
    const { workerId, year, month, type } = req.query;
    const filters = {};
    if (workerId) filters.workerId = workerId;
    if (year) filters.year = Number(year);
    if (month) filters.month = Number(month);
    if (type) filters.type = type;
    
    const expenses = expenseModel.getAll(
      Object.keys(filters).length > 0 ? filters : undefined
    );
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: '获取支出记录失败' });
  }
});

app.get('/api/expenses/stats', (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: '需要提供年份和月份' });
    }
    const stats = expenseModel.getMonthlyStats(Number(year), Number(month));
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: '获取支出统计失败' });
  }
});

app.get('/api/expenses/worker/:workerId', (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: '需要提供年份和月份' });
    }
    const expenses = expenseModel.getByWorkerAndMonth(
      req.params.workerId,
      Number(year),
      Number(month)
    );
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: '获取支出记录失败' });
  }
});

app.get('/api/expenses/worker/:workerId/stats', (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: '需要提供年份和月份' });
    }
    const stats = expenseModel.getWorkerStats(
      req.params.workerId,
      Number(year),
      Number(month)
    );
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: '获取支出统计失败' });
  }
});

app.post('/api/expenses', (req, res) => {
  try {
    const { date, workerId, type, amount, remark } = req.body;
    if (!date || !workerId || !type || amount === undefined) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    const expense = expenseModel.create(date, workerId, type, amount, remark);
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: '创建支出记录失败' });
  }
});

app.put('/api/expenses/:id', (req, res) => {
  try {
    const { date, workerId, type, amount, remark } = req.body;
    if (!date || !workerId || !type || amount === undefined) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    const expense = expenseModel.update(req.params.id, date, workerId, type, amount, remark);
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: '更新支出记录失败' });
  }
});

app.delete('/api/expenses/:id', (req, res) => {
  try {
    expenseModel.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除支出记录失败' });
  }
});

// 统计概览 API
app.get('/api/overview', (req, res) => {
  try {
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || (now.getMonth() + 1);

    const workers = workerModel.getAll();
    const attendanceStats = attendanceModel.getMonthlyStats(year, month);
    const expenseStats = expenseModel.getMonthlyStats(year, month);
    
    // 计算总工日
    const totalWorkDays = attendanceStats.reduce((sum, w) => sum + (w.totalDays || 0), 0);

    res.json({
      totalWorkers: workers.length,
      totalWorkDays,
      totalLivingExpense: expenseStats.totalLiving,
      totalWage: expenseStats.totalWage,
      totalExpense: expenseStats.totalLiving + expenseStats.totalWage,
      year,
      month
    });
  } catch (error) {
    res.status(500).json({ error: '获取概览失败' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
