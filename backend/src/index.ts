import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { prisma } from './prisma';

const app = Fastify({ logger: true });

app.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
});

app.register(jwt, {
  secret: process.env.JWT_SECRET || 'supersecret'
});

app.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.send(err)
  }
})

// Register Routes
import usersRoutes from './routes/users';
import customersRoutes from './routes/customers';
import productsRoutes from './routes/products';
import routesApi from './routes/routes';
import salesRoutes from './routes/sales';
import dashboardRoutes from './routes/dashboard';
import healthRoutes from './routes/health';

app.register(usersRoutes, { prefix: '/api/users' });
app.register(customersRoutes, { prefix: '/api/customers' });
app.register(productsRoutes, { prefix: '/api/products' });
app.register(routesApi, { prefix: '/api/routes' });
app.register(salesRoutes, { prefix: '/api/sales' });
app.register(dashboardRoutes, { prefix: '/api/dashboard' });
app.register(healthRoutes, { prefix: '/api/health' });

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
