import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';

export default async function productsRoutes(app: FastifyInstance) {
  app.get('/', { preValidation: [app.authenticate] }, async (request, reply) => {
    return prisma.product.findMany({ where: { disabledAt: null } });
  });

  app.get('/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product || product.disabledAt) return reply.code(404).send({ error: 'Product not found' });
    return product;
  });

  app.post('/', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { name, price, stock, cost } = request.body as any;
    return prisma.product.create({
      data: { name, price, cost, stock }
    });
  });

  app.put('/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const { name, price, stock, cost } = request.body as any;
    try {
      return await prisma.product.update({
        where: { id },
        data: { name, price, cost, stock }
      });
    } catch (e) {
      return reply.code(404).send({ error: 'Product not found' });
    }
  });

  app.delete('/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    await prisma.product.update({
      where: { id },
      data: { disabledAt: new Date() }
    });
    return { success: true };
  });
}
