import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import routes from './routes.js';
import { initRealtime, notifyFromRequest } from './services/realtime.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

app.use(cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'smart-pantry-api',
  });
});

app.use('/api', (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    const result = originalJson(body);
    if (res.statusCode < 400) {
      notifyFromRequest(req);
    }
    return result;
  }) as typeof res.json;
  next();
});

app.use('/api', routes);

initRealtime(server);

server.listen(PORT, () => {
  console.log(`🚀 Smart Pantry API running on port ${PORT}`);
});
