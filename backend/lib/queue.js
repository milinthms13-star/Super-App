const EventEmitter = require('events');

// Lightweight in-process queue as a safe default when Redis/BullMQ isn't configured.
class InMemoryQueue extends EventEmitter {
  constructor() {
    super();
    this.jobs = [];
  }

  async add(name, data) {
    const job = { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, name, data, attempts: 0 };
    this.jobs.push(job);
    // process next tick
    setImmediate(() => this.emit('job', job));
    return job;
  }

  process(fn) {
    this.on('job', async (job) => {
      try {
        await fn(job);
      } catch (err) {
        // emit failed for diagnostics
        this.emit('failed', job, err);
      }
    });
  }
}

const queue = new InMemoryQueue();

module.exports = queue;
