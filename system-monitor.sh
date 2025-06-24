#!/bin/bash
LOG="/home/productmindaidev/logs/system-monitor.log"
mkdir -p $(dirname $LOG)
echo "[$(date)] 🚀 系统级监控" | tee -a $LOG
healthy=0
urls=(
  "https://productmindai.com/"
  "https://productmindai.com/ai-products/1010"
  "https://productmindai.com/static-pages/pdhtml/af4d3885-7ba3-45e5-a44a-f29d02640c78/index.html"
  "https://productmindai.com/dashboard"
)

send_email() {
  local subject="$1"
  local body="$2"
  echo "$body" | mail -s "[ProductMind AI] $subject" 402493977@qq.com
  if [ $? -eq 0 ]; then
    echo "[$(date)] 📧 邮件发送成功" | tee -a $LOG
  else
    echo "[$(date)] ❌ 邮件发送失败" | tee -a $LOG
  fi
}

for url in "${urls[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 $url)
  if [ "$code" = "200" ]; then
    healthy=$((healthy + 1))
    echo "[$(date)] ✅ $url - OK" | tee -a $LOG
  else
    echo "[$(date)] ❌ $url - FAIL ($code)" | tee -a $LOG
  fi
done

echo "[$(date)] 📊 检查结果: $healthy/${#urls[@]} 个页面正常" | tee -a $LOG

if [ $healthy -ne ${#urls[@]} ]; then
  failed=$(( ${#urls[@]} - healthy ))
  echo "[$(date)] 🚨 检测到 $failed 个页面异常" | tee -a $LOG
  
  alert_body="🚨 ProductMind AI 系统级监控告警

检测时间: $(date)
异常页面: $failed/${#urls[@]}

异常详情:"
  
  for url in "${urls[@]}"; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 $url)
    if [ "$code" != "200" ]; then
      alert_body="$alert_body
❌ $url - HTTP $code"
    fi
  done
  
  alert_body="$alert_body

系统将自动重启服务...

---
🤖 ProductMind AI 系统级监控"
  
  echo "[$(date)] 📧 发送告警邮件..." | tee -a $LOG
  send_email "网站异常告警 - ${failed}个页面异常" "$alert_body"
  
  if ! pm2 list | grep -q "website-monitor.*online"; then
    echo "[$(date)] 🔄 执行系统级恢复" | tee -a $LOG
    pm2 restart all >> $LOG 2>&1
    sudo systemctl reload nginx >> $LOG 2>&1
    
    # 等待服务启动后验证恢复
    sleep 15
    recovery_healthy=0
    for url in "${urls[@]}"; do
      code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 $url)
      if [ "$code" = "200" ]; then
        recovery_healthy=$((recovery_healthy + 1))
      fi
    done
    
    if [ $recovery_healthy -eq ${#urls[@]} ]; then
      echo "[$(date)] 🎉 所有服务已恢复正常" | tee -a $LOG
      recovery_body="✅ 所有 ${#urls[@]} 个页面已恢复正常！

恢复时间: $(date)
监控方式: 系统级监控

---
🤖 ProductMind AI 系统级监控"
      send_email "服务恢复成功" "$recovery_body"
    else
      echo "[$(date)] ⚠️ 服务恢复不完全: $recovery_healthy/${#urls[@]}" | tee -a $LOG
    fi
  else
    echo "[$(date)] ℹ️ Node.js监控正常运行，等待其处理" | tee -a $LOG
  fi
else
  echo "[$(date)] ✅ 所有服务正常运行" | tee -a $LOG
fi

echo "[$(date)] 🏁 监控完成" | tee -a $LOG
