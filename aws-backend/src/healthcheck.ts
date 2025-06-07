import http from 'http';

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  method: 'GET',
  timeout: 3000
};

const request = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('Health check passed');
    process.exit(0);
  } else {
    console.log(`Health check failed with status: ${res.statusCode}`);
    process.exit(1);
  }
});

request.on('error', (error) => {
  console.log(`Health check failed: ${error.message}`);
  process.exit(1);
});

request.on('timeout', () => {
  console.log('Health check timeout');
  process.exit(1);
});

request.end(); 