import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { connectDB, disconnectDB } from './server/db.js';
import { seedInitialData } from './server/services/seedService.js';

// Existing routes
import authRouter from './server/routes/auth.js';
import jobsRouter from './server/routes/jobs.js';
import providersRouter from './server/routes/providers.js';
import paymentsRouter from './server/routes/payments.js';
import violationsRouter from './server/routes/violations.js';
import notificationsRouter from './server/routes/notifications.js';
import ratingsRouter from './server/routes/ratings.js';
import usersRouter from './server/routes/users.js';
import adminRouter from './server/routes/admin.js';
import walletRouter from './server/routes/wallet.js';
import quotesRouter from './server/routes/quotes.js';

// New capability + vendor + storefront + cart + orders routes
import onboardingRouter from './server/routes/onboarding.js';
import vendorRouter from './server/routes/vendor.js';
import storesRouter from './server/routes/stores.js';
import cartRouter from './server/routes/cart.js';
import ordersRouter from './server/routes/orders.js';

// Logistics domain — same server, same DB, same auth middleware
import ridesRouter from './server/routes/logistics/rides.js';
import driversRouter from './server/routes/logistics/drivers.js';
import dispatchRouter from './server/routes/logistics/dispatch.js';
import deliveriesRouter from './server/routes/logistics/deliveries.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').filter(Boolean);
  app.use(cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 2. API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/jobs', jobsRouter);
  app.use('/api/providers', providersRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/violations', violationsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/ratings', ratingsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/wallet', walletRouter);
  app.use('/api/quotes', quotesRouter);

  // New routes — capability onboarding, vendor management, public
  // storefront, cart + checkout, orders + logistics handoff.
  app.use('/api/onboarding', onboardingRouter);
  app.use('/api/vendor', vendorRouter);
  app.use('/api/stores', storesRouter);
  app.use('/api/cart', cartRouter);
  app.use('/api/orders', ordersRouter);

  // Logistics domain routes
  app.use('/api/logistics/rides', ridesRouter);
  app.use('/api/logistics/drivers', driversRouter);
  app.use('/api/logistics/dispatch', dispatchRouter);
  app.use('/api/logistics/deliveries', deliveriesRouter);

  // Healthcheck endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Rush Merchant TypeScript + MongoDB Server',
      timestamp: new Date().toISOString(),
      architecture: 'multi-capability (CUSTOMER/VENDOR/SERVICE_PROVIDER/RIDER)',
    });
  });

  // 3. Vite Frontend Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 5. Start Server on Port 3000
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Rush Merchant Full-Stack Express Server running at http://0.0.0.0:${PORT}`);
  });

  // 6. Connect to DB & Seed asynchronously
  connectDB().then(() => {
    seedInitialData().catch(err => console.error('Seed error:', err));
  }).catch(err => {
    console.error('DB connection background error:', err);
  });

  // 7. Graceful shutdown
  let shuttingDown = false;
  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    server.close();
    await disconnectDB();
    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2'));
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
