import { FastifyInstance } from 'fastify';
import { Prisma } from '../generated/prisma/client';
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

interface VisitsQuery {
  showVisited?: string;
}

export default async function visitsRoutes(app: FastifyInstance) {
  // Get all visits (sales with nextVisitDate set)
  app.get('/', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { showVisited } = request.query as VisitsQuery;
    const parsedShowVisited = parseBoolean(showVisited);

    const where: Prisma.SaleWhereInput = {
      nextVisitDate: { not: null },
      visitedAt: parsedShowVisited === true ? { not: null } : null
    };

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
