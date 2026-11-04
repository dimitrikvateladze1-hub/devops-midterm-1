const { createClient } = require('redis');

const KEY = 'tasks';
const SEQ = 'tasks:seq';

function createRedisStore(url) {
  const client = createClient({
    url,
    disableOfflineQueue: true,
    socket: { reconnectStrategy: () => 1000 },
  });
  client.on('error', (err) => console.error(`redis: ${err.message}`));
  client.connect().catch((err) => console.error(`redis: ${err.message}`));

  return {
    async ping() {
      try {
        await client.ping();
        return true;
      } catch (err) {
        return false;
      }
    },
    async all() {
      const rows = await client.hVals(KEY);
      return rows.map((row) => JSON.parse(row)).sort((a, b) => a.id - b.id);
    },
    async add(task) {
      const id = await client.incr(SEQ);
      const saved = { id, ...task };
      await client.hSet(KEY, String(id), JSON.stringify(saved));
      return saved;
    },
    async update(task) {
      await client.hSet(KEY, String(task.id), JSON.stringify(task));
      return task;
    },
    async remove(id) {
      await client.hDel(KEY, String(id));
    },
  };
}

module.exports = { createRedisStore };
