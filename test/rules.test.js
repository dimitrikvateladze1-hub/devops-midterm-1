const request = require('supertest');
const { createApp } = require('../src/app');
const { createMemoryStore } = require('../src/store/memory');

function futureDate(days = 7) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('README business rules', () => {
  let app;

  beforeEach(() => {
    app = createApp(createMemoryStore());
  });

  test('rule 1: title is trimmed and stored clean', async () => {
    const res = await request(app).post('/tasks').send({ title: '  Buy milk  ' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Buy milk');
  });

  test('rule 1: missing or non-string title returns 400', async () => {
    expect((await request(app).post('/tasks').send({})).status).toBe(400);
    expect((await request(app).post('/tasks').send({ title: 123 })).status).toBe(400);
  });

  test('rule 2: whitespace-only title returns 400', async () => {
    const res = await request(app).post('/tasks').send({ title: '     ' });
    expect(res.status).toBe(400);
  });

  test('rule 2: title length is checked after trimming (1..100)', async () => {
    const ok = await request(app).post('/tasks').send({ title: ` ${'a'.repeat(100)} ` });
    expect(ok.status).toBe(201);
    const tooLong = await request(app).post('/tasks').send({ title: 'a'.repeat(101) });
    expect(tooLong.status).toBe(400);
  });

  test('rule 3: priority defaults to medium, accepts low/high, rejects others', async () => {
    const def = await request(app).post('/tasks').send({ title: 'a' });
    expect(def.body.priority).toBe('medium');
    const low = await request(app).post('/tasks').send({ title: 'b', priority: 'low' });
    expect(low.body.priority).toBe('low');
    const high = await request(app).post('/tasks').send({ title: 'c', priority: 'high' });
    expect(high.body.priority).toBe('high');
    const bad = await request(app).post('/tasks').send({ title: 'd', priority: 'urgent' });
    expect(bad.status).toBe(400);
  });

  test('rule 4: GET /tasks returns newest first, also with priority filter', async () => {
    await request(app).post('/tasks').send({ title: 'first', priority: 'high' });
    await request(app).post('/tasks').send({ title: 'second', priority: 'low' });
    await request(app).post('/tasks').send({ title: 'third', priority: 'high' });

    const all = await request(app).get('/tasks');
    expect(all.body.map((t) => t.title)).toEqual(['third', 'second', 'first']);

    const high = await request(app).get('/tasks?priority=high');
    expect(high.body.map((t) => t.title)).toEqual(['third', 'first']);
  });

  test('rule 5: completing twice returns 409 and keeps completedAt', async () => {
    const created = await request(app).post('/tasks').send({ title: 'x' });
    const first = await request(app).post(`/tasks/${created.body.id}/complete`);
    expect(first.status).toBe(200);
    expect(first.body.done).toBe(true);

    const second = await request(app).post(`/tasks/${created.body.id}/complete`);
    expect(second.status).toBe(409);

    const after = await request(app).get(`/tasks/${created.body.id}`);
    expect(after.body.completedAt).toBe(first.body.completedAt);
  });

  test('rule 6: unknown task returns 404 for get, complete and delete', async () => {
    expect((await request(app).get('/tasks/999')).status).toBe(404);
    expect((await request(app).post('/tasks/999/complete')).status).toBe(404);
    expect((await request(app).delete('/tasks/999')).status).toBe(404);
  });

  test('delete removes the task', async () => {
    const created = await request(app).post('/tasks').send({ title: 'x' });
    expect((await request(app).delete(`/tasks/${created.body.id}`)).status).toBe(204);
    expect((await request(app).get(`/tasks/${created.body.id}`)).status).toBe(404);
  });

  test('rule 7: doneRate is 0 when there are no tasks', async () => {
    const res = await request(app).get('/stats');
    expect(res.body).toEqual({ total: 0, done: 0, open: 0, doneRate: 0 });
  });

  test('rule 7: doneRate is a rounded percentage', async () => {
    const ids = [];
    for (const title of ['a', 'b', 'c']) {
      ids.push((await request(app).post('/tasks').send({ title })).body.id);
    }
    await request(app).post(`/tasks/${ids[0]}/complete`);
    expect((await request(app).get('/stats')).body.doneRate).toBe(33);
    await request(app).post(`/tasks/${ids[1]}/complete`);
    expect((await request(app).get('/stats')).body.doneRate).toBe(67);
  });

  test('rule 8: dueDate is optional', async () => {
    const res = await request(app).post('/tasks').send({ title: 'x' });
    expect(res.status).toBe(201);
    expect(res.body.dueDate).toBeNull();
  });

  test('rule 8: valid future dueDate is accepted', async () => {
    const due = futureDate();
    const res = await request(app).post('/tasks').send({ title: 'x', dueDate: due });
    expect(res.status).toBe(201);
    expect(res.body.dueDate).toBe(due);
  });

  test('rule 8: wrong format, impossible or past dueDate returns 400', async () => {
    for (const dueDate of ['2030/01/01', '01-01-2030', '2030-02-30', '2000-01-01', 20300101]) {
      const res = await request(app).post('/tasks').send({ title: 'x', dueDate });
      expect(res.status).toBe(400);
    }
  });
});

describe('service endpoints', () => {
  test('/health returns 200 when the store is available', async () => {
    const res = await request(createApp(createMemoryStore())).get('/health');
    expect(res.status).toBe(200);
  });

  test('/health returns 503 when the store is unavailable', async () => {
    const store = { ...createMemoryStore(), ping: async () => false };
    const res = await request(createApp(store)).get('/health');
    expect(res.status).toBe(503);
  });

  test('/version returns APP_VERSION or dev', async () => {
    const saved = process.env.APP_VERSION;
    delete process.env.APP_VERSION;
    const app = createApp(createMemoryStore());
    expect((await request(app).get('/version')).body.version).toBe('dev');
    process.env.APP_VERSION = '9.9.9';
    expect((await request(app).get('/version')).body.version).toBe('9.9.9');
    if (saved === undefined) {
      delete process.env.APP_VERSION;
    } else {
      process.env.APP_VERSION = saved;
    }
  });

  test('unexpected store errors return 500', async () => {
    const store = {
      ...createMemoryStore(),
      all: async () => {
        throw new Error('boom');
      },
    };
    const res = await request(createApp(store)).get('/tasks');
    expect(res.status).toBe(500);
  });
});
