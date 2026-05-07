import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';
import { Prisma } from '../generated/prisma/client';

export default async function productsRoutes(app: FastifyInstance) {
  app.get('/', { preValidation: [app.authenticate] }, async (request, reply) => {
    const showDisabled = (request.query as any).showDisabled as string === 'true';
    if (showDisabled) {
      return prisma.product.findMany({ orderBy: { name: 'asc' } });
    }
    return prisma.product.findMany({ where: { disabledAt: null }, orderBy: { name: 'asc' } });
  });

  app.get('/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product || product.disabledAt) return reply.code(404).send({ error: 'Product not found' });
    return product;
  });

  app.post('/', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { name, price, stock, cost } = request.body as any;
    try {
      return await prisma.product.create({
        data: { name, price, cost, stock }
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientValidationError) {
        // Argument type/validation mismatch (like your case)
        const completeErrorMessage = e.message.split('\n').join(' ');
        console.error('Validation error when creating product:', completeErrorMessage);
        const rootCause = e.message.split('\n').filter(Boolean).at(-1);
        return reply.code(400).send({ error: rootCause });
      }
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      return reply.code(400).send({ error: `Failed to create product: ${errorMessage}` });
    }
  });

  app.put('/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const { name, price, stock, cost, disabledAt } = request.body as any;
    try {
      return await prisma.product.update({
        where: { id },
        data: { name, price, cost, stock, disabledAt: disabledAt ? new Date(disabledAt) : null }
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientValidationError) {
        // Argument type/validation mismatch (like your case)
        const completeErrorMessage = e.message.split('\n').join(' ');
        console.error('Validation error when updating product:', completeErrorMessage);
        const rootCause = e.message.split('\n').filter(Boolean).at(-1);
        return reply.code(400).send({ error: rootCause });
      }
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      return reply.code(404).send({ error: `Product not found: ${errorMessage}` });
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
