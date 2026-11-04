const { createMemoryStore } = require('../src/store/memory');
const tasks = require('../src/tasks');

describe('priority filter', () => {
  test('listTasks returns only the requested priority', async () => {
    const store = createMemoryStore();
    await tasks.createTask(store, { title: 'A', priority: 'low' });
    await tasks.createTask(store, { title: 'B', priority: 'high' });
    await tasks.createTask(store, { title: 'C', priority: 'high' });

    const high = await tasks.listTasks(store, { priority: 'high' });
    expect(high.map((t) => t.title).sort()).toEqual(['B', 'C']);
  });

  test('listTasks returns everything without a filter', async () => {
    const store = createMemoryStore();
    await tasks.createTask(store, { title: 'A', priority: 'low' });
    await tasks.createTask(store, { title: 'B', priority: 'high' });

    expect(await tasks.listTasks(store)).toHaveLength(2);
  });
});
