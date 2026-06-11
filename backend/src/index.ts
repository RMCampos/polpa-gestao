import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { prisma } from './prisma';

if (!process.env.JWT_SECRET) {
  console.error("CRITICAL ERROR: JWT_SECRET environment variable is not set. Exiting...");
  process.exit(1);
}

const app = Fastify({ logger: true });

app.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
});

app.register(jwt, {
  secret: process.env.JWT_SECRET
});

app.register(rateLimit, {
  global: false,
});

app.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify()
    const dbUser = await prisma.user.findUnique({
      where: { id: (request.user as any).id },
      select: { disabledAt: true }
    });
    if (!dbUser || dbUser.disabledAt) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }
  } catch (err) {
    return reply.send(err)
  }
})

app.decorate('requireAdmin', async (request: any, reply: any) => {
  try {
    await request.jwtVerify()
    const dbUser = await prisma.user.findUnique({
      where: { id: (request.user as any).id },
      select: { disabledAt: true, role: true }
    });
    if (!dbUser || dbUser.disabledAt) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }
    if (dbUser.role !== 'admin') {
      return reply.code(403).send({ error: 'Forbidden: Admin access required' })
    }
  } catch (err) {
    return reply.send(err)
  }
})

// Register Routes
import usersRoutes from './routes/users';
import customersRoutes from './routes/customers';
import customerPosRoutes from './routes/customer-pos';
import productsRoutes from './routes/products';
import routesApi from './routes/routes';
import salesRoutes from './routes/sales';
import visitsRoutes from './routes/visits';
import dashboardRoutes from './routes/dashboard';
import healthRoutes from './routes/health';
import publicRoutes from './routes/public';

app.register(usersRoutes, { prefix: '/api/users' });
app.register(customersRoutes, { prefix: '/api/customers' });
app.register(customerPosRoutes, { prefix: '/api/customer-pos' });
app.register(productsRoutes, { prefix: '/api/products' });
app.register(routesApi, { prefix: '/api/routes' });
app.register(salesRoutes, { prefix: '/api/sales' });
app.register(visitsRoutes, { prefix: '/api/visits' });
app.register(dashboardRoutes, { prefix: '/api/dashboard' });
app.register(healthRoutes, { prefix: '/api/health' });
app.register(publicRoutes, { prefix: '/api/public' });

app.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    app.log.info('Server running on port 3000');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
