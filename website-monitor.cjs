#!/usr/bin/env node

/**
 * ProductMind AI 网站监控和自动恢复系统
 * 功能：监控网站状态，异常时发送邮件告警并自动重启服务
 */

const https = require('https');
const http = require('http');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// 配置信息
const CONFIG = {
  MONITOR_INTERVAL: 5 * 60 * 1000, // 5分钟
  MONITOR_URLS: [
    'https://productmindai.com/',
    'https://productmindai.com/ai-products/1010',
    'https://productmindai.com/static-pages/pdhtml/af4d3885-7ba3-45e5-a44a-f29d02640c78/index.html',
    'https://productmindai.com/static-pages/pdhtml/af4d3885-7ba3-45e5-a44a-f29d02640c78/4502a7fe-d30c-49bf-af2a-302e929c6e07.html',
    'https://productmindai.com/dashboard'
  ],
  EMAIL: {
    TO: '402493977@qq.com',
    FROM: 'support@aibuildagents.com',
    PASSWORD: 'hw123456H@',
    SMTP_HOST: 'email-smtp.us-east-1.amazonaws.com',
    SMTP_PORT: 587
  },
  RESTART_COMMANDS: [
    'pm2 restart all',
    'sudo systemctl reload nginx',
    'sleep 15'
  ],
  TIMEOUT: 30000,
  LOG_FILE: '/home/productmindaidev/logs/website-monitor.log'
};

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  
  fs.appendFile(CONFIG.LOG_FILE, logMessage + '\n').catch(err => {
    console.error('写入日志文件失败:', err.message);
  });
}

function checkUrl(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: CONFIG.TIMEOUT,
      headers: {
        'User-Agent': 'ProductMind-AI-Monitor/1.0.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    };
    
    const req = client.request(options, (res) => {
      const responseTime = Date.now() - startTime;
      const isHealthy = res.statusCode >= 200 && res.statusCode < 400;
      
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          url,
          healthy: isHealthy,
          statusCode: res.statusCode,
          responseTime,
          error: isHealthy ? null : `HTTP ${res.statusCode}`,
          bodyLength: body.length
        });
      });
    });
    
    req.on('error', (err) => {
      const responseTime = Date.now() - startTime;
      resolve({
        url,
        healthy: false,
        statusCode: null,
        responseTime,
        error: err.message,
        bodyLength: 0
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      const responseTime = Date.now() - startTime;
      resolve({
        url,
        healthy: false,
        statusCode: null,
        responseTime,
        error: `请求超时 (${CONFIG.TIMEOUT}ms)`,
        bodyLength: 0
      });
    });
    
    req.end();
  });
}

async function checkAllUrls() {
  log('🔍 开始健康检查...');
  const results = await Promise.all(
    CONFIG.MONITOR_URLS.map(url => checkUrl(url))
  );
  
  const healthyCount = results.filter(r => r.healthy).length;
  const unhealthyUrls = results.filter(r => !r.healthy);
  
  log(`📊 检查完成: ${healthyCount}/${results.length} 个页面正常`);
  
  results.forEach(result => {
    const status = result.healthy ? '✅' : '❌';
    const details = result.healthy 
      ? `${result.statusCode} (${result.responseTime}ms)`
      : `${result.error}`;
    log(`${status} ${result.url} - ${details}`);
  });
  
  return {
    allHealthy: unhealthyUrls.length === 0,
    healthyCount,
    totalCount: results.length,
    unhealthyUrls,
    results
  };
}

async function sendEmail(subject, body) {
  try {
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransporter({
      host: CONFIG.EMAIL.SMTP_HOST,
      port: CONFIG.EMAIL.SMTP_PORT,
      secure: false,
      auth: {
        user: CONFIG.EMAIL.FROM,
        pass: CONFIG.EMAIL.PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    const mailOptions = {
      from: `"ProductMind AI Monitor" <${CONFIG.EMAIL.FROM}>`,
      to: CONFIG.EMAIL.TO,
      subject: `[ProductMind AI] ${subject}`,
      text: body
    };
    
    const info = await transporter.sendMail(mailOptions);
    log(`📧 邮件发送成功: ${info.messageId}`);
    return info;
  } catch (error) {
    log(`❌ 邮件发送失败: ${error.message}`, 'ERROR');
    throw error;
  }
}

async function restartServices() {
  log('🔄 开始重启服务...');
  
  for (const command of CONFIG.RESTART_COMMANDS) {
    try {
      log(`⚡ 执行命令: ${command}`);
      await new Promise((resolve, reject) => {
        exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
          if (error) {
            log(`❌ 命令执行失败: ${error.message}`, 'ERROR');
            reject(error);
          } else {
            if (stdout) log(`📄 输出: ${stdout.trim()}`);
            if (stderr) log(`⚠️ 错误输出: ${stderr.trim()}`, 'WARN');
            resolve();
          }
        });
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      log(`❌ 重启命令失败: ${command} - ${error.message}`, 'ERROR');
    }
  }
  
  log('✅ 服务重启完成');
}

async function handleFailure(checkResult) {
  try {
    const timestamp = new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai'
    });
    
    let alertBody = `🚨 ProductMind AI 网站监控告警

检测时间: ${timestamp}
异常页面数量: ${checkResult.unhealthyUrls.length}/${checkResult.totalCount}

异常详情:
`;
    
    checkResult.unhealthyUrls.forEach(result => {
      alertBody += `❌ ${result.url}
   状态: ${result.error}
   响应时间: ${result.responseTime}ms

`;
    });
    
    alertBody += `正常页面:
`;
    
    checkResult.results.filter(r => r.healthy).forEach(result => {
      alertBody += `✅ ${result.url} (${result.statusCode}, ${result.responseTime}ms)
`;
    });
    
    alertBody += `
系统将自动尝试重启服务来恢复正常运行...

---
ProductMind AI 自动监控系统`;
    
    await sendEmail(`网站异常告警 - ${checkResult.unhealthyUrls.length}个页面异常`, alertBody);
    
    await restartServices();
    
    log('⏳ 等待服务启动完成...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    log('🔍 验证服务恢复状态...');
    const afterRestart = await checkAllUrls();
    
    const recoveredUrls = checkResult.unhealthyUrls.filter(before => 
      afterRestart.results.find(after => 
        after.url === before.url && after.healthy
      )
    );
    
    const stillFailingUrls = checkResult.unhealthyUrls.filter(before => 
      afterRestart.results.find(after => 
        after.url === before.url && !after.healthy
      )
    );
    
    let recoveryBody = `✅ ProductMind AI 服务恢复通知

恢复时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
服务重启: 已完成
恢复验证: 已完成

恢复结果:
`;
    
    if (recoveredUrls.length > 0) {
      recoveryBody += `🎉 已恢复页面 (${recoveredUrls.length}个):
`;
      recoveredUrls.forEach(url => {
        const afterResult = afterRestart.results.find(r => r.url === url.url);
        recoveryBody += `✅ ${url.url} (${afterResult.statusCode}, ${afterResult.responseTime}ms)
`;
      });
    }
    
    if (stillFailingUrls.length > 0) {
      recoveryBody += `⚠️ 仍有问题的页面 (${stillFailingUrls.length}个):
`;
      stillFailingUrls.forEach(url => {
        const afterResult = afterRestart.results.find(r => r.url === url.url);
        recoveryBody += `❌ ${url.url} - ${afterResult.error}
`;
      });
    }
    
    recoveryBody += `当前状态: ${afterRestart.healthyCount}/${afterRestart.totalCount} 个页面正常

---
ProductMind AI 自动监控系统`;
    
    const recoverySubject = afterRestart.allHealthy 
      ? '服务恢复成功 - 所有页面正常'
      : `服务部分恢复 - ${afterRestart.unhealthyUrls.length}个页面仍有问题`;
    
    await sendEmail(recoverySubject, recoveryBody);
    
    if (afterRestart.allHealthy) {
      log('🎉 所有服务已成功恢复');
    } else {
      log(`⚠️ 部分服务仍有问题: ${afterRestart.unhealthyUrls.length}个页面异常`, 'WARN');
    }
    
  } catch (error) {
    log(`❌ 异常处理失败: ${error.message}`, 'ERROR');
    
    try {
      await sendEmail(
        '监控系统异常 - 自动恢复失败',
        `监控系统在处理异常时发生错误:

${error.message}

请手动检查系统状态。

---
ProductMind AI 自动监控系统`
      );
    } catch (emailError) {
      log(`❌ 发送失败通知邮件也失败了: ${emailError.message}`, 'ERROR');
    }
  }
}

async function runMonitorCheck() {
  try {
    const checkResult = await checkAllUrls();
    
    if (!checkResult.allHealthy) {
      log(`🚨 检测到异常: ${checkResult.unhealthyUrls.length}个页面异常`, 'WARN');
      await handleFailure(checkResult);
    } else {
      log('✅ 所有服务正常运行');
    }
    
  } catch (error) {
    log(`❌ 监控检查失败: ${error.message}`, 'ERROR');
  }
}

async function initMonitor() {
  try {
    const logDir = path.dirname(CONFIG.LOG_FILE);
    await fs.mkdir(logDir, { recursive: true });
    
    log('🚀 ProductMind AI 网站监控系统启动');
    log(`📊 监控间隔: ${CONFIG.MONITOR_INTERVAL / 1000 / 60} 分钟`);
    log(`📝 监控页面数量: ${CONFIG.MONITOR_URLS.length}`);
    log(`📧 告警邮箱: ${CONFIG.EMAIL.TO}`);
    log(`📁 日志文件: ${CONFIG.LOG_FILE}`);
    
    await runMonitorCheck();
    
    setInterval(runMonitorCheck, CONFIG.MONITOR_INTERVAL);
    
    log('✅ 监控系统已启动，正在运行中...');
    
  } catch (error) {
    log(`❌ 监控系统初始化失败: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  log('📴 收到关闭信号，正在停止监控系统...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('📴 收到终止信号，正在停止监控系统...');
  process.exit(0);
});

// 模块导出
module.exports = {
  checkUrl,
  checkAllUrls,
  sendEmail,
  restartServices,
  runMonitorCheck,
  handleFailure,
  initMonitor
};

// 如果直接运行脚本
if (require.main === module) {
  initMonitor().catch(error => {
    console.error('启动失败:', error);
    process.exit(1);
  });
} 