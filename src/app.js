const express = require('express');
const tasks = require('./tasks');

const wrap = (handler) => (req, res, next) => handler(req, res).catch(next);

// Builds the Express app: health and version endpoints, the /tasks CRUD routes,
// /stats, and a JSON error handler that maps err.status to the response code.
function createApp(store) {
  const app = express();
  app.use(express.json());

  app.get('/health', wrap(async (req, res) => {
    const ok = await store.ping();
    res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'unavailable' });
  }));

  app.get('/version', (req, res) => {
    res.json({ version: process.env.APP_VERSION || 'dev' });
  });

  app.get('/tasks', wrap(async (req, res) => {
    res.json(await tasks.listTasks(store, { priority: req.query.priority }));
  }));

  app.post('/tasks', wrap(async (req, res) => {
    res.status(201).json(await tasks.createTask(store, req.body));
  }));

  app.get('/tasks/:id', wrap(async (req, res) => {
    res.json(await tasks.getTask(store, req.params.id));
  }));

  app.post('/tasks/:id/complete', wrap(async (req, res) => {
    res.json(await tasks.completeTask(store, req.params.id));
  }));

  app.delete('/tasks/:id', wrap(async (req, res) => {
    await tasks.removeTask(store, req.params.id);
    res.status(204).end();
  }));

  app.get('/stats', wrap(async (req, res) => {
    res.json(await tasks.stats(store));
  }));

  app.use((err, req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }
    return res.status(err.status || 500).json({ error: err.message });
  });

  return app;
}

module.exports = { createApp };
