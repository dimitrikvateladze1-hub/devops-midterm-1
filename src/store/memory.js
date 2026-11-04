function createMemoryStore() {
  const items = new Map();
  let seq = 0;

  return {
    async ping() {
      return true;
    },
    async all() {
      return [...items.values()].map((task) => structuredClone(task));
    },
    async add(task) {
      seq += 1;
      const saved = { id: seq, ...task };
      items.set(saved.id, saved);
      return structuredClone(saved);
    },
    async update(task) {
      items.set(task.id, structuredClone(task));
      return structuredClone(task);
    },
    async remove(id) {
      items.delete(id);
    },
  };
}

module.exports = { createMemoryStore };
