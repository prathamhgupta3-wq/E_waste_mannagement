const app = require('./app');
const config = require('./config/env');

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` EcoCircuit — Smart E-Waste Management Backend Active`);
  console.log(`=======================================================`);
  console.log(` Environment : ${config.nodeEnv}`);
  console.log(` Port        : ${PORT}`);
  console.log(` Server URL  : http://localhost:${PORT}`);
  console.log(` Health      : http://localhost:${PORT}/api/health`);
  console.log(` Categories  : http://localhost:${PORT}/api/categories`);
  console.log(` Centres     : http://localhost:${PORT}/api/collection-centres`);
  console.log(` Frontend    : http://localhost:${PORT}/code.html`);
  console.log(`=======================================================`);
});

// Graceful Shutdown
function handleShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down EcoCircuit server gracefully...`);
  server.close(() => {
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
