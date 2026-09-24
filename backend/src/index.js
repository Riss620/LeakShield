const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');

const webhookRoutes = require('./api/routes/webhook');
const apiRoutes = require('./api/routes/api');
const settingsRoutes = require('./api/routes/settings');
const authRoutes = require('./api/routes/auth');

const app = express();
const PORT = process.env.PORT || 4000;

const Redis = require('ioredis');
const redisSub = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

redisSub.subscribe('scan_events');
redisSub.on('message', (channel, message) => {
  if (channel === 'scan_events') {
    const payload = JSON.parse(message);
    app.emit('sse_broadcast', payload);
  }
});

app.use(cors());
app.use(express.json());

// Attach routes
app.use('/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api', apiRoutes);
app.use('/api/settings', settingsRoutes);

// Server-Sent Events (SSE) Endpoint for real-time frontend updates
let clients = [];

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clients.push(res);

  req.on('close', () => {
    clients = clients.filter(client => client !== res);
  });
});

// Broadcast events emitted by routes
app.on('sse_broadcast', ({ event, data }) => {
  clients.forEach(client => {
    client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`LeakShield backend running on port ${PORT}`);
  });
}

module.exports = app;
