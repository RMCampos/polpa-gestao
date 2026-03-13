import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';

export default async function customersRoutes(app: FastifyInstance) {
  // Get all customers (with pos optionally)
  app.get('/', { preValidation: [app.authenticate] }, async (request, reply) => {
    return prisma.customer.findMany({
      where: { disabledAt: null },
      include: { pos: { where: { disabledAt: null } } }
    });
  });

  // Get specific customer
  app.get('/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { pos: { where: { disabledAt: null } } }
    });
    if (!customer || customer.disabledAt) return reply.code(404).send({ error: 'Customer not found' });
    return customer;
  });

  // Create customer
  app.post('/', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { name, document, phone } = request.body as any;
    try {
      return await prisma.customer.create({ data: { name, document, phone } });
    } catch (e: any) {
      if (e.code === 'P2002') return reply.code(400).send({ error: 'Document already exists' });
      throw e;
    }
  });

  // Update customer
  app.put('/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const { name, document, phone } = request.body as any;
    try {
      if (document) {
        const existing = await prisma.customer.findFirst({
          where: { document, id: { not: id } }
        });
        if (existing) {
          return reply.code(400).send({ error: 'Document already exists for another customer' });
        }
      }
      return await prisma.customer.update({ where: { id }, data: { name, document, phone } });
    } catch (e) {
      return reply.code(404).send({ error: 'Customer not found' });
    }
  });

  // Delete customer (soft)
  app.delete('/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    await prisma.customer.update({ where: { id }, data: { disabledAt: new Date() } });
    return { success: true };
  });

  // --- Point of Sales for Customer ---

  app.post('/:customerId/pos', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { customerId } = request.params as any;
    const { address, phone } = request.body as any;
    return prisma.customerPos.create({
      data: { customerId, address, phone }
    });
  });

  app.put('/pos/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const { address, phone } = request.body as any;
    return prisma.customerPos.update({
      where: { id },
      data: { address, phone }
    });
  });

  app.delete('/pos/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    await prisma.customerPos.update({
      where: { id },
      data: { disabledAt: new Date() }
    });
    return { success: true };
  });
}
