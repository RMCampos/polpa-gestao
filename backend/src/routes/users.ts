import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { prisma } from '../prisma';

interface LoginFailure {
  consecutiveFailures: number;
  lockoutUntil?: number;
  lastAttempt: number;
}

// NOTE: Process-local. In a multi-replica deployment, replace with a shared
// store (e.g. Redis) to enforce lockout across all instances.
const loginFailures = new Map<string, LoginFailure>();

const MAX_CONSECUTIVE_FAILURES = 3;
const BASE_LOCKOUT_MS = 2000;
const MAX_LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes
const FAILURE_ENTRY_TTL_MS = 60 * 60 * 1000; // 1 hour

// Dummy hash for constant-time bcrypt comparison when user is missing/disabled,
// preventing user enumeration via response timing.
const DUMMY_HASH = bcrypt.hashSync('__timing_prevention__', 10);

setInterval(() => {
  const cutoff = Date.now() - FAILURE_ENTRY_TTL_MS;
  for (const [key, record] of loginFailures.entries()) {
    if (record.lastAttempt < cutoff) loginFailures.delete(key);
  }
}, 10 * 60 * 1000).unref();

export default async function usersRoutes(app: FastifyInstance) {
  app.post('/login', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
        keyGenerator: (request: any) => request.ip
      }
    }
  }, async (request, reply) => {
    const { email, password } = request.body as any;
    const clientIp = request.ip;
    const normalizedEmail = (email || '').toLowerCase().trim();
    const failureKey = `${clientIp}-${normalizedEmail || 'unknown'}`;

    // Check if locked out
    const failureRecord = loginFailures.get(failureKey);
    if (failureRecord?.lockoutUntil && failureRecord.lockoutUntil > Date.now()) {
      const waitTime = Math.ceil((failureRecord.lockoutUntil - Date.now()) / 1000);
      return reply.code(429).send({
        error: `Too many failed login attempts. Please wait ${waitTime} seconds.`
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    // Always run bcrypt to prevent user enumeration via response timing
    const hashToCompare = (user && !user.disabledAt) ? user.password : DUMMY_HASH;
    const isValid = (await bcrypt.compare(password, hashToCompare)) && !!user && !user.disabledAt;

    if (!isValid) {
      const record = failureRecord || { consecutiveFailures: 0, lastAttempt: 0 };
      record.consecutiveFailures += 1;
      record.lastAttempt = Date.now();

      if (record.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        const rawBackoff = BASE_LOCKOUT_MS * Math.pow(2, record.consecutiveFailures - MAX_CONSECUTIVE_FAILURES);
        record.lockoutUntil = Date.now() + Math.min(rawBackoff, MAX_LOCKOUT_MS);
      }
      loginFailures.set(failureKey, record);

      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // Success: clear failures
    loginFailures.delete(failureKey);

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '8h' });
    return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  });

  app.get('/', { preValidation: [app.requireAdmin] }, async (request, reply) => {
    const showDisabled = (request.query as any).showDisabled as string === 'true';
    const users = await prisma.user.findMany({
      where: showDisabled ? {} : { disabledAt: null },
      select: { id: true, name: true, email: true, role: true, createdAt: true, disabledAt: true },
    });
    return users;
  });

  app.post('/', { preValidation: [app.requireAdmin] }, async (request, reply) => {
    const { name, email, password, role } = request.body as any;
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(400).send({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role },
    });

    return { id: user.id, name: user.name, email: user.email, role: user.role };
  });

  app.put('/:id', { preValidation: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as any;
    const { name, email, role, password } = request.body as any;
    
    // Check if target user is disabled
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.disabledAt) return reply.code(404).send({ error: 'User not found' });

    let updateData: any = { name, email, role };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });
    
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  });

  app.delete('/:id', { preValidation: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as any;
    await prisma.user.update({
      where: { id },
      data: { disabledAt: new Date() },
    });
    return { success: true };
  });
}
