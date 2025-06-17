module.exports = {
  apps: [{
    name: 'productmind',
    script: `${process.env.HOME}/.nvm/versions/node/v20.12.2/bin/netlify`,
    args: 'dev --port 8888',
    env: {
      NODE_ENV: 'production',
      PATH: `${process.env.HOME}/.nvm/versions/node/v20.12.2/bin:${process.env.PATH}`
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/www/wwwroot/logs/error.log',
    out_file: '/www/wwwroot/logs/out.log',
    log_file: '/www/wwwroot/logs/combined.log',
    max_memory_restart: '1G',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    restart_delay: 4000,
    merge_logs: true,
    time: true
  }]
}