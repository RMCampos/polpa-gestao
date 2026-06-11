import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';

export default async function customerPosRoutes(app: FastifyInstance) {
  app.delete('/:id', { preValidation: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as any;
    try {
      await prisma.customerPos.delete({ where: { id } });
      return { success: true };
    } catch (e: any) {
      if (e?.code === 'P2025') return reply.code(404).send({ error: 'Point of sale not found' });
      return reply.code(500).send({ error: 'Failed to delete point of sale' });
    }
  });
}
