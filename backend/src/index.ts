import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'smart-pantry-api' });
});

// Główne trasy API
app.use('/api', routes);

// Serwowanie plików statycznych frontendu (dla środowiska produkcyjnego / Docker)
const clientDistPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h2>Spiżarnia API działa pomyślnie na porcie ${PORT}!</h2>
            <p>Aby uruchomić interfejs w trybie developerskim, uruchom serwer Vite w katalogu frontend.</p>
          </body>
        </html>
      `);
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Smart Pantry Server running on http://localhost:${PORT}`);
});
