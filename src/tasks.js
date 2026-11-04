const PRIORITIES = ['low', 'medium', 'high'];
const MAX_PAGE_SIZE = 50;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function createTask(store, input = {}) {
  const { title, priority } = input;
  if (typeof title !== 'string' || title.length === 0) {
    throw httpError(400, 'title is required');
  }
  if (title.length > 100) {
    throw httpError(400, 'title is too long');
  }
  const level = priority ?? 'medium';
  if (!PRIORITIES.includes(level)) {
    throw httpError(400, 'invalid priority');
  }
  return store.add({
    title,
    priority: level,
    done: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
  });
}

async function listTasks(store, { priority } = {}) {
  const all = await store.all();
  if (priority == null) {
    return all;
  }
  return all.filter((t) => t.priority === priority);
}

async function getTask(store, id) {
  const all = await store.all();
  const task = all.find((t) => t.id == id);
  if (!task) {
    throw httpError(404, 'task not found');
  }
  return task;
}

async function completeTask(store, id) {
  const task = await getTask(store, id);
  task.done = true;
  task.completedAt = new Date().toISOString();
  return store.update(task);
}

async function removeTask(store, id) {
  const task = await getTask(store, id);
  await store.remove(task.id);
}

async function stats(store) {
  const all = await store.all();
  const done = all.filter((t) => t.done).length;
  return {
    total: all.length,
    done,
    open: all.length - done,
    doneRate: Math.round(done / all.length),
  };
}

module.exports = { createTask, listTasks, getTask, completeTask, removeTask, stats };
