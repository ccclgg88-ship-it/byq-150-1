const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db = null;
let SQL = null;

async function initDatabase() {
  SQL = await initSqlJs();
  
  const dbPath = path.join(__dirname, '..', 'data', 'hr_system.db');
  const dataDir = path.join(__dirname, '..', 'data');
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    migrateDatabase();
    saveDatabase();
    console.log('✅ SQLite 数据库加载成功');
  } else {
    db = new SQL.Database();
    initTables();
    initData();
    saveDatabase();
    console.log('✅ SQLite 数据库初始化成功');
  }
  
  return db;
}

function migrateDatabase() {
  try {
    const leaveCols = db.exec("PRAGMA table_info(leave_applications)");
    const leaveColNames = leaveCols[0]?.values.map(c => c[1]) || [];
    
    if (!leaveColNames.includes('reject_reason')) {
      db.run('ALTER TABLE leave_applications ADD COLUMN reject_reason TEXT');
      console.log('🔧 迁移：添加 leave_applications.reject_reason 字段');
    }
    if (!leaveColNames.includes('rejected_by')) {
      db.run('ALTER TABLE leave_applications ADD COLUMN rejected_by TEXT');
      console.log('🔧 迁移：添加 leave_applications.rejected_by 字段');
    }
    if (!leaveColNames.includes('rejected_at')) {
      db.run('ALTER TABLE leave_applications ADD COLUMN rejected_at TEXT');
      console.log('🔧 迁移：添加 leave_applications.rejected_at 字段');
    }

    const empCols = db.exec("PRAGMA table_info(employees)");
    const empColNames = empCols[0]?.values.map(c => c[1]) || [];
    
    if (!empColNames.includes('phone')) {
      db.run('ALTER TABLE employees ADD COLUMN phone TEXT');
      console.log('🔧 迁移：添加 employees.phone 字段');
    }
    if (!empColNames.includes('email')) {
      db.run('ALTER TABLE employees ADD COLUMN email TEXT');
      console.log('🔧 迁移：添加 employees.email 字段');
    }
    if (!empColNames.includes('annual_leave_balance')) {
      db.run('ALTER TABLE employees ADD COLUMN annual_leave_balance INTEGER DEFAULT 0');
      console.log('🔧 迁移：添加 employees.annual_leave_balance 字段');
    }

    const tableCheck = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='makeup_applications'");
    if (!tableCheck.length || tableCheck[0].values.length === 0) {
      db.run(`
        CREATE TABLE IF NOT EXISTS makeup_applications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id INTEGER NOT NULL,
          makeup_date TEXT NOT NULL,
          makeup_type TEXT NOT NULL,
          clock_in_time TEXT,
          clock_out_time TEXT,
          reason TEXT,
          status TEXT DEFAULT 'pending',
          current_level INTEGER DEFAULT 1,
          manager_approved_at TEXT,
          hr_approved_at TEXT,
          reject_reason TEXT,
          rejected_by TEXT,
          rejected_at TEXT,
          revoked_at TEXT,
          created_at TEXT DEFAULT (datetime('now', 'localtime')),
          updated_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
      `);
      console.log('🔧 迁移：创建 makeup_applications 补卡申请表');
    }
  } catch (error) {
    console.error('数据库迁移失败:', error.message);
  }
}

function saveDatabase() {
  if (!db) return;
  const dbPath = path.join(__dirname, '..', 'data', 'hr_system.db');
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function initTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      manager_id INTEGER,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_no TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      department_id INTEGER,
      position TEXT,
      hire_date TEXT,
      phone TEXT,
      email TEXT,
      status TEXT DEFAULT 'active',
      role TEXT DEFAULT 'employee',
      password TEXT DEFAULT '123456',
      annual_leave_balance INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      record_date TEXT NOT NULL,
      clock_in_time TEXT,
      clock_out_time TEXT,
      status TEXT DEFAULT 'normal',
      work_hours REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(employee_id, record_date)
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS leave_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      leave_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days REAL NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      current_level INTEGER DEFAULT 1,
      manager_approved_at TEXT,
      hr_approved_at TEXT,
      reject_reason TEXT,
      rejected_by TEXT,
      rejected_at TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      holiday_date TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS makeup_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      makeup_date TEXT NOT NULL,
      makeup_type TEXT NOT NULL,
      clock_in_time TEXT,
      clock_out_time TEXT,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      current_level INTEGER DEFAULT 1,
      manager_approved_at TEXT,
      hr_approved_at TEXT,
      reject_reason TEXT,
      rejected_by TEXT,
      rejected_at TEXT,
      revoked_at TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
}

function initData() {
  db.run(`INSERT INTO departments (name, manager_id) VALUES ('技术部', 2), ('产品部', 5), ('人事部', 1), ('财务部', 7), ('市场部', 8)`);
  
  db.run(`
    INSERT INTO employees (employee_no, name, department_id, position, hire_date, status, role, annual_leave_balance) VALUES
    ('HR001', '张三', 3, 'HR经理', '2020-01-15', 'active', 'hr', 15),
    ('TECH001', '李四', 1, '技术总监', '2019-03-20', 'active', 'manager', 15),
    ('TECH002', '王五', 1, '前端工程师', '2022-06-10', 'active', 'employee', 5),
    ('TECH003', '赵六', 1, '后端工程师', '2021-09-01', 'active', 'employee', 10),
    ('PROD001', '钱七', 2, '产品经理', '2020-11-05', 'active', 'manager', 15),
    ('PROD002', '孙八', 2, '产品专员', '2023-02-14', 'active', 'employee', 0),
    ('FIN001', '周九', 4, '财务主管', '2018-07-01', 'active', 'manager', 15),
    ('MARK001', '吴十', 5, '市场经理', '2020-04-20', 'active', 'manager', 15)
  `);
  
  const holidays2024 = [
    ['2024-01-01', '元旦'],
    ['2024-02-10', '春节'], ['2024-02-11', '春节'], ['2024-02-12', '春节'],
    ['2024-02-13', '春节'], ['2024-02-14', '春节'], ['2024-02-15', '春节'],
    ['2024-02-16', '春节'], ['2024-02-17', '春节'],
    ['2024-04-04', '清明节'], ['2024-04-05', '清明节'], ['2024-04-06', '清明节'],
    ['2024-05-01', '劳动节'], ['2024-05-02', '劳动节'], ['2024-05-03', '劳动节'],
    ['2024-05-04', '劳动节'], ['2024-05-05', '劳动节'],
    ['2024-06-10', '端午节'],
    ['2024-09-15', '中秋节'], ['2024-09-16', '中秋节'], ['2024-09-17', '中秋节'],
    ['2024-10-01', '国庆节'], ['2024-10-02', '国庆节'], ['2024-10-03', '国庆节'],
    ['2024-10-04', '国庆节'], ['2024-10-05', '国庆节'], ['2024-10-06', '国庆节'],
    ['2024-10-07', '国庆节']
  ];
  
  const stmt = db.prepare('INSERT INTO holidays (holiday_date, name) VALUES (?, ?)');
  holidays2024.forEach(h => {
    stmt.bind(h);
    stmt.step();
    stmt.reset();
  });
  stmt.free();
  
  db.run(`
    INSERT INTO attendance_records (employee_id, record_date, clock_in_time, clock_out_time, status, work_hours) VALUES
    (2, '2024-06-03', '08:55:00', '18:30:00', 'normal', 9.5),
    (2, '2024-06-04', '09:15:00', '18:00:00', 'late', 8.75),
    (2, '2024-06-05', '08:45:00', '18:10:00', 'normal', 9.42),
    (3, '2024-06-03', '09:05:00', '18:00:00', 'late', 8.92),
    (3, '2024-06-04', '08:50:00', '17:30:00', 'early_leave', 8.67),
    (3, '2024-06-05', '08:55:00', '18:05:00', 'normal', 9.17),
    (4, '2024-06-03', '08:30:00', '19:00:00', 'normal', 10.5),
    (4, '2024-06-04', '08:45:00', '18:30:00', 'normal', 9.75),
    (4, '2024-06-05', '09:30:00', '18:00:00', 'late', 8.5)
  `);
  
  db.run(`
    INSERT INTO leave_applications (employee_id, leave_type, start_date, end_date, days, reason, status, current_level, manager_approved_at, hr_approved_at) VALUES
    (3, 'annual', '2024-06-10', '2024-06-11', 2, '家里有事需要处理', 'approved', 2, '2024-06-08 10:00:00', '2024-06-08 14:00:00'),
    (4, 'sick', '2024-06-06', '2024-06-06', 1, '感冒发烧', 'approved', 2, '2024-06-05 16:00:00', '2024-06-05 17:00:00'),
    (6, 'personal', '2024-06-17', '2024-06-18', 2, '出差回来调休', 'pending', 1, NULL, NULL)
  `);
}

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const trimmed = sql.trim().toUpperCase();
      const isSelect = trimmed.startsWith('SELECT') || trimmed.startsWith('SHOW') || trimmed.startsWith('DESCRIBE');
      
      if (isSelect) {
        const stmt = db.prepare(sql);
        
        if (params && params.length > 0) {
          stmt.bind(params);
        }
        
        const columns = stmt.getColumnNames();
        const rows = [];
        
        while (stmt.step()) {
          const row = stmt.getAsObject();
          rows.push(row);
        }
        
        stmt.free();
        resolve([rows, []]);
      } else {
        const stmt = db.prepare(sql);
        
        if (params && params.length > 0) {
          stmt.bind(params);
        }
        
        stmt.step();
        stmt.free();
        saveDatabase();
        
        const result = {
          affectedRows: db.getRowsModified(),
          insertId: null
        };
        
        if (trimmed.startsWith('INSERT')) {
          const lastIdResult = db.exec('SELECT last_insert_rowid() as id');
          if (lastIdResult.length > 0 && lastIdResult[0].values.length > 0) {
            result.insertId = lastIdResult[0].values[0][0];
          }
        }
        
        resolve([result, undefined]);
      }
    } catch (error) {
      console.error('SQLite query error:', error.message);
      console.error('SQL:', sql.substring(0, 200));
      if (params && params.length > 0) {
        console.error('Params:', params);
      }
      reject(error);
    }
  });
}

async function testConnection() {
  try {
    await query('SELECT 1 as test');
    console.log('✅ SQLite 数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ SQLite 数据库连接失败:', error.message);
    return false;
  }
}

module.exports = { initDatabase, query, testConnection, saveDatabase };
