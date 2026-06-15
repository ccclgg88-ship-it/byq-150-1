const express = require('express');
const cors = require('cors');
const { testConnection, initDatabase } = require('./config/database');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leave');
const makeupRoutes = require('./routes/makeup');
const departmentRoutes = require('./routes/departments');
const reportRoutes = require('./routes/reports');
const holidayRoutes = require('./routes/holidays');

const app = express();
const PORT = process.env.PORT || 8001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/makeup', makeupRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/holidays', holidayRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'HR System API is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

async function startServer() {
  try {
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在端口 ${PORT}`);
      console.log(`📊 API 地址: http://localhost:${PORT}/api`);
      console.log(`💓 健康检查: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
