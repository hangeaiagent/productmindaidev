module.exports = {
  apps: [{
    name: "aws-backend",
    script: "dist/server.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    restart_delay: 4000,
    merge_logs: true,
    time: true,
    env: {
      NODE_ENV: "production",
      PORT: 3001
    }
  }]
} 