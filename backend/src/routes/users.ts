import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { prisma } from '../prisma';

export default async function usersRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const { email, password } = request.body as any;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.disabledAt) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });
    return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  });

  app.get('/', { preValidation: [app.authenticate] }, async (request, reply) => {
    const showDisabled = (request.query as any).showDisabled as string === 'true';
    const users = await prisma.user.findMany({
      where: showDisabled ? {} : { disabledAt: null },
      select: { id: true, name: true, email: true, role: true, createdAt: true, disabledAt: true },
    });
    return users;
  });

  app.post('/', { preValidation: [app.authenticate] }, async (request, reply) => {
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

  app.put('/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
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

  app.delete('/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    await prisma.user.update({
      where: { id },
      data: { disabledAt: new Date() },
    });
    return { success: true };
  });
}
