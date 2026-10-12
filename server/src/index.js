try { process.loadEnvFile(); } catch { /* no .env file — use defaults */ }

// This box has IPv6 egress and Node's default DNS order ("verbatim") will
// happily use it. Payment providers whitelist our IPv4 address, so an IPv6
// connection arrives from an unknown address and is rejected. Prefer IPv4.
const { default: dns } = await import('node:dns');
dns.setDefaultResultOrder('ipv4first');

const { default: express } = await import('express');
const { default: cors } = await import('cors');
const { default: routes } = await import('./routes.js');

const app = express();
const PORT = Number(process.env.PORT) || 4000;

const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim());
app.use(cors({ origin: origins }));

// The Lenco webhook signature covers the exact bytes sent, so this route must
// see the raw body. It has to be registered before the JSON parser.
app.use('/api/payments/lenco/webhook', express.raw({ type: '*/*', limit: '1mb' }));

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
