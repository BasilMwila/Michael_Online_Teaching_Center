try { process.loadEnvFile(); } catch { /* no .env file — use defaults */ }

const { default: express } = await import('express');
const { default: cors } = await import('cors');
const { default: routes } = await import('./routes.js');

const app = express();
const PORT = Number(process.env.PORT) || 4000;

const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim());
app.use(cors({ origin: origins }));
app.use(express.json({ limit: '2mb' }));

app.use('/api', routes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Empire Skills API listening on http://localhost:${PORT}`);
  console.log(`SQLite DB: ${process.env.DB_PATH || './data/empireskills.db'}`);
});
