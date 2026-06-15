CREATE DATABASE IF NOT EXISTS hr_system DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE hr_system;

-- 部门表
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  manager_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 员工表
CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_no VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  department_id INT NULL,
  position VARCHAR(100) NULL,
  hire_date DATE NULL,
  status ENUM('active', 'resigned', 'suspended') DEFAULT 'active',
  role ENUM('employee', 'manager', 'hr') DEFAULT 'employee',
  password VARCHAR(255) DEFAULT '123456',
  annual_leave_balance INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 考勤记录表
CREATE TABLE IF NOT EXISTS attendance_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  record_date DATE NOT NULL,
  clock_in_time TIME NULL,
  clock_out_time TIME NULL,
  status ENUM('normal', 'late', 'early_leave', 'absent', 'leave', 'weekend', 'holiday') DEFAULT 'normal',
  work_hours DECIMAL(4,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_emp_date (employee_id, record_date),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 请假申请表
CREATE TABLE IF NOT EXISTS leave_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  leave_type ENUM('annual', 'personal', 'sick') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days DECIMAL(4,1) NOT NULL,
  reason TEXT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  current_level INT DEFAULT 1,
  manager_approved_at TIMESTAMP NULL,
  hr_approved_at TIMESTAMP NULL,
  reject_reason TEXT NULL,
  rejected_by VARCHAR(50) NULL,
  rejected_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 节假日表
CREATE TABLE IF NOT EXISTS holidays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  holiday_date DATE NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入初始部门数据
INSERT INTO departments (name) VALUES
('技术部'),
('产品部'),
('人事部'),
('财务部'),
('市场部');

-- 插入初始员工数据
INSERT INTO employees (employee_no, name, department_id, position, hire_date, status, role, annual_leave_balance) VALUES
('HR001', '张三', 3, 'HR经理', '2020-01-15', 'active', 'hr', 15),
('TECH001', '李四', 1, '技术总监', '2019-03-20', 'active', 'manager', 15),
('TECH002', '王五', 1, '前端工程师', '2022-06-10', 'active', 'employee', 5),
('TECH003', '赵六', 1, '后端工程师', '2021-09-01', 'active', 'employee', 10),
('PROD001', '钱七', 2, '产品经理', '2020-11-05', 'active', 'manager', 15),
('PROD002', '孙八', 2, '产品专员', '2023-02-14', 'active', 'employee', 0),
('FIN001', '周九', 4, '财务主管', '2018-07-01', 'active', 'manager', 15),
('MARK001', '吴十', 5, '市场经理', '2020-04-20', 'active', 'manager', 15);

-- 更新部门负责人
UPDATE departments SET manager_id = 2 WHERE id = 1;
UPDATE departments SET manager_id = 5 WHERE id = 2;
UPDATE departments SET manager_id = 1 WHERE id = 3;
UPDATE departments SET manager_id = 7 WHERE id = 4;
UPDATE departments SET manager_id = 8 WHERE id = 5;

-- 插入2024年节假日数据
INSERT INTO holidays (holiday_date, name) VALUES
('2024-01-01', '元旦'),
('2024-02-10', '春节'),
('2024-02-11', '春节'),
('2024-02-12', '春节'),
('2024-02-13', '春节'),
('2024-02-14', '春节'),
('2024-02-15', '春节'),
('2024-02-16', '春节'),
('2024-02-17', '春节'),
('2024-04-04', '清明节'),
('2024-04-05', '清明节'),
('2024-04-06', '清明节'),
('2024-05-01', '劳动节'),
('2024-05-02', '劳动节'),
('2024-05-03', '劳动节'),
('2024-05-04', '劳动节'),
('2024-05-05', '劳动节'),
('2024-06-10', '端午节'),
('2024-09-15', '中秋节'),
('2024-09-16', '中秋节'),
('2024-09-17', '中秋节'),
('2024-10-01', '国庆节'),
('2024-10-02', '国庆节'),
('2024-10-03', '国庆节'),
('2024-10-04', '国庆节'),
('2024-10-05', '国庆节'),
('2024-10-06', '国庆节'),
('2024-10-07', '国庆节');

-- 插入一些示例考勤记录（2024年6月）
INSERT INTO attendance_records (employee_id, record_date, clock_in_time, clock_out_time, status, work_hours) VALUES
(2, '2024-06-03', '08:55:00', '18:30:00', 'normal', 9.5),
(2, '2024-06-04', '09:15:00', '18:00:00', 'late', 8.75),
(2, '2024-06-05', '08:45:00', '18:10:00', 'normal', 9.42),
(3, '2024-06-03', '09:05:00', '18:00:00', 'late', 8.92),
(3, '2024-06-04', '08:50:00', '17:30:00', 'early_leave', 8.67),
(3, '2024-06-05', '08:55:00', '18:05:00', 'normal', 9.17),
(4, '2024-06-03', '08:30:00', '19:00:00', 'normal', 10.5),
(4, '2024-06-04', '08:45:00', '18:30:00', 'normal', 9.75),
(4, '2024-06-05', '09:30:00', '18:00:00', 'late', 8.5);

-- 插入示例请假申请
INSERT INTO leave_applications (employee_id, leave_type, start_date, end_date, days, reason, status, current_level, manager_approved_at, hr_approved_at) VALUES
(3, 'annual', '2024-06-10', '2024-06-11', 2, '家里有事需要处理', 'approved', 2, '2024-06-08 10:00:00', '2024-06-08 14:00:00'),
(4, 'sick', '2024-06-06', '2024-06-06', 1, '感冒发烧', 'approved', 2, '2024-06-05 16:00:00', '2024-06-05 17:00:00'),
(6, 'personal', '2024-06-17', '2024-06-18', 2, '出差回来调休', 'pending', 1, NULL, NULL);
