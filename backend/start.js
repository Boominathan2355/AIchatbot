const app = require('./dist/app').default;
const { config } = require('./dist/config/env');

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${config.port}`);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => process.exit(0));
});
