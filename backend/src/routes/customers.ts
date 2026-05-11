import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';

const parseFridgeCount = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;

  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue < 0) return 0;

  return parsedValue;
};

export default async function customersRoutes(app: FastifyInstance) {
  // Get all customers (with pos optionally)
  app.get('/', { preValidation: [app.authenticate] }, async (request, reply) => {
    const showDisabled = (request.query as any).showDisabled as string === 'true';
    return prisma.customer.findMany({
      where: showDisabled ? {} : { disabledAt: null },
      include: { pos: { where: showDisabled ? {} : { disabledAt: null } } }
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
    const { name, document, phone, personName } = request.body as any;
    const docValue = document || null;
    try {
      return await prisma.customer.create({ data: { name, document: docValue, phone, personName } });
    } catch (e: any) {
      if (e.code === 'P2002') return reply.code(400).send({ error: 'Document already exists' });
      throw e;
    }
  });

  // Update customer
  app.put('/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const { name, document, phone, personName } = request.body as any;
    const docValue = document || null;
    try {
      if (docValue) {
        const existing = await prisma.customer.findFirst({
          where: { document: docValue, id: { not: id } }
        });
        if (existing) {
          return reply.code(400).send({ error: 'Document already exists for another customer' });
        }
      }
      return await prisma.customer.update({ where: { id }, data: { name, document: docValue, phone, personName } });
    } catch (e: any) {
      if (e && e.code === 'P2025') {
        return reply.code(404).send({ error: 'Customer not found' });
      }
      return reply.code(400).send({ error: 'Invalid customer data' });
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
    const { address, phone, personName, fridgeCount } = request.body as any;
    return prisma.customerPos.create({
      data: { customerId, address, phone, personName, fridgeCount: parseFridgeCount(fridgeCount) ?? 0 }
    });
  });

  app.put('/pos/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const { address, phone, personName, fridgeCount } = request.body as any;
    const normalizedFridgeCount = parseFridgeCount(fridgeCount);
    return prisma.customerPos.update({
      where: { id },
      data: {
        address,
        phone,
        personName,
        ...(normalizedFridgeCount !== undefined ? { fridgeCount: normalizedFridgeCount } : {})
      }
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
