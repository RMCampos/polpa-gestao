import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return undefined;
}

export default async function visitsRoutes(app: FastifyInstance) {
  // Get all visits (sales with nextVisitDate set)
  app.get('/', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { showVisited } = request.query as any;
    const parsedShowVisited = parseBoolean(showVisited);

    const where: any = {
      nextVisitDate: { not: null }
    };

    if (parsedShowVisited === true) {
      where.visitedAt = { not: null };
    } else {
      where.visitedAt = null;
    }

    return prisma.sale.findMany({
      where,
      include: {
        customerPos: { include: { customer: true } },
        products: { include: { product: true } }
      },
      orderBy: { nextVisitDate: 'asc' }
    });
  });
}
