const PRIORITIES = ['low', 'medium', 'high'];

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function isMissing(value) {
  return value === undefined || value === null;
}

function parseDueDate(value) {
  if (isMissing(value)) {
    return null;
  }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw httpError(400, 'invalid dueDate');
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw httpError(400, 'invalid dueDate');
  }
  const today = new Date().toISOString().slice(0, 10);
  if (value < today) {
    throw httpError(400, 'invalid dueDate');
  }
  return value;
}

async function createTask(store, input = {}) {
  const { title, priority, dueDate } = input;
  if (typeof title !== 'string') {
    throw httpError(400, 'title is required');
  }
  const cleanTitle = title.trim();
  if (cleanTitle.length === 0) {
    throw httpError(400, 'title is required');
  }
  if (cleanTitle.length > 100) {
    throw httpError(400, 'title is too long');
  }
  const level = priority ?? 'medium';
  if (!PRIORITIES.includes(level)) {
    throw httpError(400, 'invalid priority');
  }
  return store.add({
    title: cleanTitle,
    priority: level,
    dueDate: parseDueDate(dueDate),
    done: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
  });
}

async function listTasks(store, { priority } = {}) {
  const all = await store.all();
  const sorted = all.sort((a, b) => b.id - a.id);
  if (isMissing(priority)) {
    return sorted;
  }
  return sorted.filter((t) => t.priority === priority);
}

async function getTask(store, id) {
  const all = await store.all();
  const task = all.find((t) => String(t.id) === String(id));
  if (!task) {
    throw httpError(404, 'task not found');
  }
  return task;
}

async function completeTask(store, id) {
  const task = await getTask(store, id);
  if (task.done) {
    throw httpError(409, 'task already completed');
  }
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
    doneRate: all.length === 0 ? 0 : Math.round((done / all.length) * 100),
  };
}

module.exports = { createTask, listTasks, getTask, completeTask, removeTask, stats };
