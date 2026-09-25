const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redis = new Redis(REDIS_URL, REDIS_URL.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {});

// Simple Redis List Queue instead of BullMQ for direct compatibility with the Python worker
// since BullMQ requires complex Lua scripts and data structures.
class QueueManager {
  async enqueueScan(job) {
    try {
      await redis.rpush('scan_queue', JSON.stringify(job));
      console.log(`Job enqueued for repo: ${job.repositoryId}`);
    } catch (error) {
      console.error('Error enqueuing job:', error);
    }
  }
}

module.exports = new QueueManager();
