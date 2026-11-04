const { createApp } = require('./app');
const { createMemoryStore } = require('./store/memory');

function createStore() {
  if (!process.env.REDIS_URL) {
    return createMemoryStore();
  }
  const { createRedisStore } = require('./store/redis');
  return createRedisStore(process.env.REDIS_URL);
}

const port = Number(process.env.PORT) || 3000;
const startedAt = Date.now();
const server = createApp(createStore()).listen(port, () => {
  console.log(`listening on ${port}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
