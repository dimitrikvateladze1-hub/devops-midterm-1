const { createMemoryStore } = require('../src/store/memory');
const tasks = require('../src/tasks');

describe('dueDate', () => {
  test('createTask stores a future dueDate', async () => {
    const store = createMemoryStore();
    const task = await tasks.createTask(store, { title: 'A', dueDate: '2099-12-31' });
    expect(task.dueDate).toBe('2099-12-31');
  });

  test('createTask rejects a past dueDate', async () => {
    const store = createMemoryStore();
    await expect(tasks.createTask(store, { title: 'A', dueDate: '2000-01-01' }))
      .rejects.toMatchObject({ status: 400 });
  });
});
