const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// 检测是否为打包后的环境
const isPkg = typeof process.pkg !== 'undefined';

// sql.js wasm 文件路径
function getWasmPath() {
  if (isPkg) {
    // 打包后：exe 同目录
    return path.join(path.dirname(process.execPath), 'sql-wasm.wasm');
  }
  // 开发环境：node_modules
  return path.join(__dirname, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
}

// 获取正确的资源路径
function getResourcePath(relativePath) {
  if (isPkg) {
    const exeDir = path.dirname(process.execPath);
    return path.join(exeDir, relativePath);
  }
  return path.join(__dirname, '..', relativePath);
}

// 数据库文件路径
const dbPath = getResourcePath('data.db');

let db = null;

// 初始化数据库
async function initDb() {
  const wasmPath = getWasmPath();
  let SQL;
  
  // 尝试加载 wasm 文件
  if (fs.existsSync(wasmPath)) {
    const wasmBinary = fs.readFileSync(wasmPath);
    SQL = await initSqlJs({ wasmBinary });
  } else {
    // 如果 wasm 文件不存在，尝试从网络加载（开发环境）
    SQL = await initSqlJs();
  }
  
  try {
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
      console.log('[INFO] 已加载已有数据库');
    } else {
      db = new SQL.Database();
      console.log('[INFO] 已创建新数据库');
    }
  } catch (e) {
    console.error('[ERROR] 加载数据库失败:', e);
    db = new SQL.Database();
  }
  
  // 创建表
  db.run(`
    CREATE TABLE IF NOT EXISTS workers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      jobType TEXT,
      dailyRate REAL,
      status TEXT DEFAULT 'active',
      createdAt TEXT
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      workerId TEXT NOT NULL,
      date TEXT NOT NULL,
      value REAL NOT NULL,
      UNIQUE(workerId, date)
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS constructionRecords (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      workerIds TEXT NOT NULL,
      content TEXT NOT NULL,
      remark TEXT,
      images TEXT
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      workerId TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      remark TEXT
    )
  `);
  
  // 创建索引
  db.run('CREATE INDEX IF NOT EXISTS idx_attendance_worker ON attendance(workerId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_expenses_worker ON expenses(workerId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)');
  
  saveDb();
}

// 保存数据库到文件
function saveDb() {
  if (!db) return;
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (e) {
    console.error('[ERROR] 保存数据库失败:', e);
  }
}

// 工人管理
const workerModel = {
  getAll() {
    const stmt = db.prepare('SELECT * FROM workers WHERE status = ?');
    stmt.bind(['active']);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  },
  
  getById(id) {
    const stmt = db.prepare('SELECT * FROM workers WHERE id = ?');
    stmt.bind([id]);
    let result = null;
    if (stmt.step()) {
      result = stmt.getAsObject();
    }
    stmt.free();
    return result;
  },
  
  create(name, jobType, dailyRate) {
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    db.run(
      'INSERT INTO workers (id, name, jobType, dailyRate, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, jobType || null, dailyRate || null, 'active', createdAt]
    );
    saveDb();
    return { id, name, jobType: jobType || null, dailyRate: dailyRate || null, status: 'active', createdAt };
  },
  
  update(id, name, jobType, dailyRate) {
    db.run(
      'UPDATE workers SET name = ?, jobType = ?, dailyRate = ? WHERE id = ?',
      [name, jobType || null, dailyRate || null, id]
    );
    saveDb();
    return this.getById(id);
  },
  
  delete(id) {
    db.run('UPDATE workers SET status = ? WHERE id = ?', ['inactive', id]);
    saveDb();
  },
};

// 考勤管理
const attendanceModel = {
  getByMonth(year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const stmt = db.prepare(`
      SELECT a.*, w.name as workerName, w.jobType, w.dailyRate 
      FROM attendance a 
      JOIN workers w ON a.workerId = w.id 
      WHERE a.date >= ? AND a.date <= ?
      ORDER BY a.date
    `);
    stmt.bind([startDate, endDate]);
    
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  },
  
  setAttendance(workerId, date, value) {
    const existing = db.prepare('SELECT id FROM attendance WHERE workerId = ? AND date = ?');
    existing.bind([workerId, date]);
    const exists = existing.step();
    existing.free();
    
    if (exists) {
      db.run('UPDATE attendance SET value = ? WHERE workerId = ? AND date = ?', [value, workerId, date]);
    } else {
      const id = uuidv4();
      db.run('INSERT INTO attendance (id, workerId, date, value) VALUES (?, ?, ?, ?)', [id, workerId, date, value]);
    }
    saveDb();
    return { workerId, date, value };
  },
  
  batchSetAttendance(records) {
    for (const r of records) {
      this.setAttendance(r.workerId, r.date, r.value);
    }
  },
  
  getMonthlyStats(year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const stmt = db.prepare(`
      SELECT w.*, COALESCE(SUM(a.value), 0) as totalDays
      FROM workers w
      LEFT JOIN attendance a ON w.id = a.workerId AND a.date >= ? AND a.date <= ?
      WHERE w.status = 'active'
      GROUP BY w.id
    `);
    stmt.bind([startDate, endDate]);
    
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  },
};

// 施工记录
const constructionRecordModel = {
  getAll(filters) {
    let sql = 'SELECT * FROM constructionRecords';
    const params = [];
    const conditions = [];
    
    if (filters?.workerId) {
      conditions.push('workerIds LIKE ?');
      params.push(`%"${filters.workerId}"%`);
    }
    if (filters?.year && filters?.month) {
      const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
      const endDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-31`;
      conditions.push('date >= ? AND date <= ?');
      params.push(startDate, endDate);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY date DESC';
    
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    
    const results = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        ...row,
        workerIds: JSON.parse(row.workerIds),
        images: row.images ? JSON.parse(row.images) : [],
      });
    }
    stmt.free();
    return results;
  },
  
  create(date, workerIds, content, remark) {
    const id = uuidv4();
    db.run(
      'INSERT INTO constructionRecords (id, date, workerIds, content, remark, images) VALUES (?, ?, ?, ?, ?, ?)',
      [id, date, JSON.stringify(workerIds), content, remark || null, '[]']
    );
    saveDb();
    return { id, date, workerIds, content, remark: remark || null, images: [] };
  },
  
  update(id, date, workerIds, content, remark) {
    db.run(
      'UPDATE constructionRecords SET date = ?, workerIds = ?, content = ?, remark = ? WHERE id = ?',
      [date, JSON.stringify(workerIds), content, remark || null, id]
    );
    saveDb();
    return this.getById(id);
  },
  
  getById(id) {
    const stmt = db.prepare('SELECT * FROM constructionRecords WHERE id = ?');
    stmt.bind([id]);
    let result = null;
    if (stmt.step()) {
      const row = stmt.getAsObject();
      result = {
        ...row,
        workerIds: JSON.parse(row.workerIds),
        images: row.images ? JSON.parse(row.images) : [],
      };
    }
    stmt.free();
    return result;
  },
  
  delete(id) {
    db.run('DELETE FROM constructionRecords WHERE id = ?', [id]);
    saveDb();
  },
};

// 支出记录
const expenseModel = {
  getAll(filters) {
    let sql = 'SELECT e.*, w.name as workerName FROM expenses e JOIN workers w ON e.workerId = w.id';
    const params = [];
    const conditions = [];
    
    if (filters?.workerId) {
      conditions.push('e.workerId = ?');
      params.push(filters.workerId);
    }
    if (filters?.year && filters?.month) {
      const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
      const endDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-31`;
      conditions.push('e.date >= ? AND e.date <= ?');
      params.push(startDate, endDate);
    }
    if (filters?.type) {
      conditions.push('e.type = ?');
      params.push(filters.type);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY e.date DESC';
    
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  },
  
  create(date, workerId, type, amount, remark) {
    const id = uuidv4();
    db.run(
      'INSERT INTO expenses (id, date, workerId, type, amount, remark) VALUES (?, ?, ?, ?, ?, ?)',
      [id, date, workerId, type, amount, remark || null]
    );
    saveDb();
    
    const worker = workerModel.getById(workerId);
    return { id, date, workerId, type, amount, remark: remark || null, workerName: worker?.name };
  },
  
  update(id, date, workerId, type, amount, remark) {
    db.run(
      'UPDATE expenses SET date = ?, workerId = ?, type = ?, amount = ?, remark = ? WHERE id = ?',
      [date, workerId, type, amount, remark || null, id]
    );
    saveDb();
    return this.getById(id);
  },
  
  getById(id) {
    const stmt = db.prepare('SELECT * FROM expenses WHERE id = ?');
    stmt.bind([id]);
    let result = null;
    if (stmt.step()) {
      result = stmt.getAsObject();
    }
    stmt.free();
    return result;
  },
  
  delete(id) {
    db.run('DELETE FROM expenses WHERE id = ?', [id]);
    saveDb();
  },
  
  getMonthlyStats(year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const stmt = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'living_expense' THEN amount ELSE 0 END), 0) as totalLiving,
        COALESCE(SUM(CASE WHEN type = 'wage' THEN amount ELSE 0 END), 0) as totalWage
      FROM expenses
      WHERE date >= ? AND date <= ?
    `);
    stmt.bind([startDate, endDate]);
    
    let result = { totalLiving: 0, totalWage: 0 };
    if (stmt.step()) {
      result = stmt.getAsObject();
    }
    stmt.free();
    return result;
  },
  
  getWorkerStats(workerId, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const stmt = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'living_expense' THEN amount ELSE 0 END), 0) as totalLiving,
        COALESCE(SUM(CASE WHEN type = 'wage' THEN amount ELSE 0 END), 0) as totalWage
      FROM expenses
      WHERE workerId = ? AND date >= ? AND date <= ?
    `);
    stmt.bind([workerId, startDate, endDate]);
    
    let result = { totalLiving: 0, totalWage: 0 };
    if (stmt.step()) {
      result = stmt.getAsObject();
    }
    stmt.free();
    return result;
  },
};

// 启动服务
async function startServer() {
  await initDb();
  
  const app = express();
  const PORT = process.env.PORT || 3001;
  
  app.use(cors());
  app.use(express.json());
  
  // 工人 API
  app.get('/api/workers', (_req, res) => res.json(workerModel.getAll()));
  app.get('/api/workers/:id', (req, res) => {
    const worker = workerModel.getById(req.params.id);
    if (!worker) return res.status(404).json({ error: '工人不存在' });
    res.json(worker);
  });
  app.post('/api/workers', (req, res) => {
    const { name, jobType, dailyRate } = req.body;
    if (!name) return res.status(400).json({ error: '姓名必填' });
    const worker = workerModel.create(name, jobType, dailyRate);
    res.status(201).json(worker);
  });
  app.put('/api/workers/:id', (req, res) => {
    const { name, jobType, dailyRate } = req.body;
    if (!name) return res.status(400).json({ error: '姓名必填' });
    res.json(workerModel.update(req.params.id, name, jobType, dailyRate));
  });
  app.delete('/api/workers/:id', (req, res) => { workerModel.delete(req.params.id); res.json({ success: true }); });
  
  // 考勤 API
  app.get('/api/attendance', (req, res) => {
    const { year, month } = req.query;
    if (!year || !month) return res.status(400).json({ error: '需要提供年份和月份' });
    res.json(attendanceModel.getByMonth(Number(year), Number(month)));
  });
  app.get('/api/attendance/stats', (req, res) => {
    const { year, month } = req.query;
    if (!year || !month) return res.status(400).json({ error: '需要提供年份和月份' });
    res.json(attendanceModel.getMonthlyStats(Number(year), Number(month)));
  });
  app.post('/api/attendance', (req, res) => {
    const { workerId, date, value } = req.body;
    if (!workerId || !date || value === undefined) return res.status(400).json({ error: '缺少必要参数' });
    res.status(201).json(attendanceModel.setAttendance(workerId, date, value));
  });
  app.post('/api/attendance/batch', (req, res) => {
    const { records } = req.body;
    if (!records || !Array.isArray(records)) return res.status(400).json({ error: '需要提供记录数组' });
    attendanceModel.batchSetAttendance(records);
    res.json({ success: true });
  });
  
  // 施工记录 API
  app.get('/api/construction-records', (req, res) => {
    const { workerId, year, month } = req.query;
    const filters = {};
    if (workerId) filters.workerId = workerId;
    if (year) filters.year = Number(year);
    if (month) filters.month = Number(month);
    res.json(constructionRecordModel.getAll(Object.keys(filters).length > 0 ? filters : undefined));
  });
  app.get('/api/construction-records/:id', (req, res) => {
    const record = constructionRecordModel.getById(req.params.id);
    if (!record) return res.status(404).json({ error: '记录不存在' });
    res.json(record);
  });
  app.post('/api/construction-records', (req, res) => {
    const { date, workerIds, content, remark } = req.body;
    if (!date || !workerIds || !content) return res.status(400).json({ error: '缺少必要参数' });
    res.status(201).json(constructionRecordModel.create(date, workerIds, content, remark));
  });
  app.put('/api/construction-records/:id', (req, res) => {
    const { date, workerIds, content, remark } = req.body;
    if (!date || !workerIds || !content) return res.status(400).json({ error: '缺少必要参数' });
    res.json(constructionRecordModel.update(req.params.id, date, workerIds, content, remark));
  });
  app.delete('/api/construction-records/:id', (req, res) => { constructionRecordModel.delete(req.params.id); res.json({ success: true }); });
  
  // 支出 API
  app.get('/api/expenses', (req, res) => {
    const { workerId, year, month, type } = req.query;
    const filters = {};
    if (workerId) filters.workerId = workerId;
    if (year) filters.year = Number(year);
    if (month) filters.month = Number(month);
    if (type) filters.type = type;
    res.json(expenseModel.getAll(Object.keys(filters).length > 0 ? filters : undefined));
  });
  app.get('/api/expenses/stats', (req, res) => {
    const { year, month } = req.query;
    if (!year || !month) return res.status(400).json({ error: '需要提供年份和月份' });
    res.json(expenseModel.getMonthlyStats(Number(year), Number(month)));
  });
  app.get('/api/expenses/worker/:workerId/stats', (req, res) => {
    const { year, month } = req.query;
    if (!year || !month) return res.status(400).json({ error: '需要提供年份和月份' });
    const stats = expenseModel.getWorkerStats(req.params.workerId, Number(year), Number(month));
    res.json(stats);
  });
  app.post('/api/expenses', (req, res) => {
    const { date, workerId, type, amount, remark } = req.body;
    if (!date || !workerId || !type || amount === undefined) return res.status(400).json({ error: '缺少必要参数' });
    res.status(201).json(expenseModel.create(date, workerId, type, amount, remark));
  });
  app.put('/api/expenses/:id', (req, res) => {
    const { date, workerId, type, amount, remark } = req.body;
    if (!date || !workerId || !type || amount === undefined) return res.status(400).json({ error: '缺少必要参数' });
    res.json(expenseModel.update(req.params.id, date, workerId, type, amount, remark));
  });
  app.delete('/api/expenses/:id', (req, res) => { expenseModel.delete(req.params.id); res.json({ success: true }); });
  
  // 概览 API
  app.get('/api/overview', (req, res) => {
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || (now.getMonth() + 1);
    
    const workers = workerModel.getAll();
    const attendanceStats = attendanceModel.getMonthlyStats(year, month);
    const expenseStats = expenseModel.getMonthlyStats(year, month);
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
  });
  
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`数据库文件: ${dbPath}`);
  });
}

startServer().catch(console.error);
