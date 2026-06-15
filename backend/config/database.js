const mysql = require('mysql2/promise');
const sqliteDb = require('./sqlite');
require('dotenv').config();

let pool = null;
let useSqlite = false;

const dbProxy = {
  query: function(sql, params) {
    if (useSqlite) {
      return sqliteDb.query(sql, params || []);
    }
    return pool.query(sql, params);
  },
  execute: function(sql, params) {
    if (useSqlite) {
      return sqliteDb.query(sql, params || []);
    }
    return pool.execute(sql, params);
  },
  getConnection: async function() {
    if (useSqlite) {
      return {
        query: (sql, params) => sqliteDb.query(sql, params || []),
        execute: (sql, params) => sqliteDb.query(sql, params || []),
        beginTransaction: () => Promise.resolve(),
        commit: () => Promise.resolve(),
        rollback: () => Promise.resolve(),
        release: () => {}
      };
    }
    return pool.getConnection();
  }
};

async function initDatabase() {
  const dbType = process.env.DB_TYPE || 'auto';
  
  if (dbType === 'sqlite') {
    useSqlite = true;
    await sqliteDb.initDatabase();
    return;
  }
  
  if (dbType === 'mysql') {
    await initMysql();
    return;
  }
  
  try {
    await initMysql();
  } catch (error) {
    console.log('⚠️ MySQL 连接失败，自动切换到 SQLite');
    useSqlite = true;
    await sqliteDb.initDatabase();
  }
}

async function initMysql() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hr_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 3000
  });
  
  const connection = await pool.getConnection();
  console.log('✅ MySQL 数据库连接成功');
  connection.release();
  useSqlite = false;
}

async function query(sql, params = []) {
  if (useSqlite) {
    return sqliteDb.query(sql, params);
  }
  return pool.execute(sql, params);
}

async function testConnection() {
  try {
    if (useSqlite) {
      await sqliteDb.testConnection();
    } else {
      const connection = await pool.getConnection();
      console.log('✅ 数据库连接成功 (MySQL)');
      connection.release();
    }
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
  }
}

module.exports = { 
  pool: dbProxy, 
  query, 
  testConnection, 
  initDatabase,
  isSqlite: () => useSqlite
};
