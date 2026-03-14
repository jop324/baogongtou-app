const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// 简单的内存数据库
const dataPath = path.join(__dirname, '..', 'data.json');

function loadDb() {
  try {
    if (fs.existsSync(dataPath)) {
      return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    }
  } catch (e) {
    console.error('加载数据失败:', e);
  }
  return {
    workers: [],
    attendance: [],
    constructionRecords: [],
    expenses: [],
  };
}

function saveDb() {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('保存数据失败:', e);
  }
}

let db = loadDb();

// 初始化数据库表（这里不需要实际创建表，因为是内存数据库）
function initDatabase() {
  console.log('数据库已初始化');
}

// 工人管理
const workerModel = {
  getAll() {
    return db.workers.filter(w => w.status === 'active');
  },

  getById(id) {
    return db.workers.find(w => w.id === id);
  },

  create(name, jobType, dailyRate) {
    const worker = {
      id: uuidv4(),
      name,
      jobType: jobType || null,
      dailyRate: dailyRate || null,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    db.workers.push(worker);
    saveDb();
    return worker;
  },

  update(id, name, jobType, dailyRate) {
    const worker = db.workers.find(w => w.id === id);
    if (worker) {
      worker.name = name;
      worker.jobType = jobType || null;
      worker.dailyRate = dailyRate || null;
      saveDb();
    }
    return worker;
  },

  delete(id) {
    const worker = db.workers.find(w => w.id === id);
    if (worker) {
      worker.status = 'inactive';
      saveDb();
    }
  },
};

// 考勤管理
const attendanceModel = {
  getByMonth(year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    return db.attendance
      .filter(a => a.date >= startDate && a.date <= endDate)
      .map(a => {
        const worker = db.workers.find(w => w.id === a.workerId);
        return {
          ...a,
          workerName: worker?.name,
          jobType: worker?.jobType,
          dailyRate: worker?.dailyRate,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  getByWorkerAndMonth(workerId, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    return db.attendance
      .filter(a => a.workerId === workerId && a.date >= startDate && a.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  setAttendance(workerId, date, value) {
    const existing = db.attendance.find(a => a.workerId === workerId && a.date === date);
    if (existing) {
      existing.value = value;
    } else {
      db.attendance.push({
        id: uuidv4(),
        workerId,
        date,
        value,
      });
    }
    saveDb();
    return { workerId, date, value };
  },

  batchSetAttendance(records) {
    for (const r of records) {
      const existing = db.attendance.find(a => a.workerId === r.workerId && a.date === r.date);
      if (existing) {
        existing.value = r.value;
      } else {
        db.attendance.push({
          id: uuidv4(),
          workerId: r.workerId,
          date: r.date,
          value: r.value,
        });
      }
    }
    saveDb();
  },

  getMonthlyStats(year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const activeWorkers = db.workers.filter(w => w.status === 'active');
    
    return activeWorkers.map(worker => {
      const workerAttendance = db.attendance.filter(
        a => a.workerId === worker.id && a.date >= startDate && a.date <= endDate
      );
      const totalDays = workerAttendance.reduce((sum, a) => sum + a.value, 0);
      
      return {
        ...worker,
        totalDays,
      };
    });
  },
};

// 施工记录
const constructionRecordModel = {
  getAll(filters) {
    let records = [...db.constructionRecords];
    
    if (filters && filters.workerId) {
      records = records.filter(r => JSON.parse(r.workerIds).includes(filters.workerId));
    }
    
    if (filters && filters.year && filters.month) {
      const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
      const endDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-31`;
      records = records.filter(r => r.date >= startDate && r.date <= endDate);
    }
    
    return records
      .map(r => ({
        ...r,
        workerIds: JSON.parse(r.workerIds),
        images: r.images ? JSON.parse(r.images) : [],
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  create(date, workerIds, content, remark) {
    const record = {
      id: uuidv4(),
      date,
      workerIds: JSON.stringify(workerIds),
      content,
      remark: remark || null,
      images: '[]',
    };
    db.constructionRecords.push(record);
    saveDb();
    return { ...record, workerIds: JSON.stringify(workerIds), images: '[]' };
  },

  update(id, date, workerIds, content, remark) {
    const record = db.constructionRecords.find(r => r.id === id);
    if (record) {
      record.date = date;
      record.workerIds = JSON.stringify(workerIds);
      record.content = content;
      record.remark = remark || null;
      saveDb();
    }
    return record;
  },

  getById(id) {
    const record = db.constructionRecords.find(r => r.id === id);
    if (!record) return null;
    return {
      ...record,
      workerIds: JSON.parse(record.workerIds),
      images: record.images ? JSON.parse(record.images) : [],
    };
  },

  delete(id) {
    const index = db.constructionRecords.findIndex(r => r.id === id);
    if (index !== -1) {
      db.constructionRecords.splice(index, 1);
      saveDb();
    }
  },
};

// 支出记录
const expenseModel = {
  getAll(filters) {
    let expenses = [...db.expenses];
    
    if (filters && filters.workerId) {
      expenses = expenses.filter(e => e.workerId === filters.workerId);
    }
    
    if (filters && filters.year && filters.month) {
      const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
      const endDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-31`;
      expenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);
    }
    
    if (filters && filters.type) {
      expenses = expenses.filter(e => e.type === filters.type);
    }
    
    return expenses
      .map(e => {
        const worker = db.workers.find(w => w.id === e.workerId);
        return {
          ...e,
          workerName: worker?.name,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  getByWorkerAndMonth(workerId, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    return db.expenses
      .filter(e => e.workerId === workerId && e.date >= startDate && e.date <= endDate)
      .map(e => {
        const worker = db.workers.find(w => w.id === e.workerId);
        return {
          ...e,
          workerName: worker?.name,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  create(date, workerId, type, amount, remark) {
    const expense = {
      id: uuidv4(),
      date,
      workerId,
      type,
      amount,
      remark: remark || null,
    };
    db.expenses.push(expense);
    saveDb();
    
    const worker = db.workers.find(w => w.id === workerId);
    return { ...expense, workerName: worker?.name };
  },

  update(id, date, workerId, type, amount, remark) {
    const expense = db.expenses.find(e => e.id === id);
    if (expense) {
      expense.date = date;
      expense.workerId = workerId;
      expense.type = type;
      expense.amount = amount;
      expense.remark = remark || null;
      saveDb();
    }
    return expense;
  },

  getById(id) {
    return db.expenses.find(e => e.id === id);
  },

  delete(id) {
    const index = db.expenses.findIndex(e => e.id === id);
    if (index !== -1) {
      db.expenses.splice(index, 1);
      saveDb();
    }
  },

  getMonthlyStats(year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const monthExpenses = db.expenses.filter(e => e.date >= startDate && e.date <= endDate);
    
    const totalLiving = monthExpenses
      .filter(e => e.type === 'living_expense')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const totalWage = monthExpenses
      .filter(e => e.type === 'wage')
      .reduce((sum, e) => sum + e.amount, 0);
    
    return { totalLiving, totalWage };
  },

  getWorkerStats(workerId, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const workerExpenses = db.expenses.filter(
      e => e.workerId === workerId && e.date >= startDate && e.date <= endDate
    );
    
    const totalLiving = workerExpenses
      .filter(e => e.type === 'living_expense')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const totalWage = workerExpenses
      .filter(e => e.type === 'wage')
      .reduce((sum, e) => sum + e.amount, 0);
    
    return { totalLiving, totalWage };
  },
};

module.exports = {
  initDatabase,
  workerModel,
  attendanceModel,
  constructionRecordModel,
  expenseModel,
};
