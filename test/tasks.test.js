const { createMemoryStore } = require('../src/store/memory');
const tasks = require('../src/tasks');

describe('tasks', () => {
  let store;

  beforeEach(() => {
    store = createMemoryStore();
  });

  test('createTask uses medium priority by default', async () => {
    const task = await tasks.createTask(store, { title: 'Write report' });
    expect(task.priority).toBe('medium');
    expect(task.done).toBe(false);
  });

  test('createTask rejects an unknown priority', async () => {
    await expect(tasks.createTask(store, { title: 'x', priority: 'urgent' }))
      .rejects.toMatchObject({ status: 400 });
  });

  test('listTasks returns the newest tasks first', async () => {
    await tasks.createTask(store, { title: 'Old' });
    await tasks.createTask(store, { title: 'New' });
    const list = await tasks.listTasks(store);
    expect(list.map((t) => t.title)).toEqual(['New', 'Old']);
  });

  test('completeTask marks the task as done', async () => {
    const task = await tasks.createTask(store, { title: 'Write report' });
    const done = await tasks.completeTask(store, task.id);
    expect(done.done).toBe(true);
    expect(done.completedAt).not.toBeNull();
  });

  test('stats returns doneRate as a percentage', async () => {
    const first = await tasks.createTask(store, { title: 'One' });
    await tasks.createTask(store, { title: 'Two' });
    await tasks.completeTask(store, first.id);
    const result = await tasks.stats(store);
    expect(result).toEqual({ total: 2, done: 1, open: 1, doneRate: 50 });
  });
});
