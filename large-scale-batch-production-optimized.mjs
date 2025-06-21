import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';

// 加载环境变量
dotenv.config();

// 正式生产环境配置
const SUPABASE_URL = 'https://uobwbhvwrciaxloqdizc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYndiaHZ3cmNpYXhsb3FkaXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzA3MTI2NiwiZXhwIjoyMDYyNjQ3MjY2fQ.ryRmf_i-EYRweVLL4fj4acwifoknqgTbIomL-S22Zmo';
const DEEPSEEK_API_KEY = process.env.VITE_DEFAULT_API_KEY || 'sk-567abb67b99d4a65acaa2d9ed06c3782';

// 大规模生产配置
const API_DELAY = 3000; // 3秒延迟
const SAVE_PROGRESS_INTERVAL = 10; // 每10个任务保存一次进度
const LOG_FILE = 'batch-production.log';

// 日志函数
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  try {
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
  } catch (error) {
    console.error('日志写入失败:', error.message);
  }
}

// 保存进度到文件
function saveProgress(progress) {
  try {
    fs.writeFileSync('batch-progress.json', JSON.stringify(progress, null, 2));
  } catch (error) {
    log(`保存进度失败: ${error.message}`);
  }
}

// 读取进度文件
function loadProgress() {
  try {
    if (fs.existsSync('batch-progress.json')) {
      const data = fs.readFileSync('batch-progress.json', 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    log(`读取进度文件失败: ${error.message}`);
  }
  return { completedTasks: [], currentIndex: 0 };
}
