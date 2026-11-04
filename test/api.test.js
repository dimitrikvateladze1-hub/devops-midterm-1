const request = require('supertest');
const { createApp } = require('../src/app');
const { createMemoryStore } = require('../src/store/memory');

describe('api', () => {
  let app;

  beforeEach(() => {
    app = createApp(createMemoryStore());
  });

  test('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  test('POST /tasks creates a task', async () => {
    const res = await request(app).post('/tasks').send({ title: 'Deploy' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(1);
  });

  test('GET /tasks/:id returns the task', async () => {
    await request(app).post('/tasks').send({ title: 'Deploy' });
    const res = await request(app).get('/tasks/1');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Deploy');
  });

  test('GET /tasks/:id returns 404 for a missing task', async () => {
    const res = await request(app).get('/tasks/99');
    expect(res.status).toBe(404);
  });
});
