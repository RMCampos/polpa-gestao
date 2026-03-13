import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';

export default async function routesApi(app: FastifyInstance) {
  // Get all routes
  app.get('/', { preValidation: [app.authenticate] }, async (request, reply) => {
    return prisma.route.findMany({
      include: {
        customerPos: {
          include: { customerPos: { include: { customer: true } } }
        }
      }
    });
  });

  // Get specific route
  app.get('/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        customerPos: {
          include: { customerPos: { include: { customer: true } } }
        }
      }
    });
    if (!route) return reply.code(404).send({ error: 'Route not found' });
    return route;
  });

  // Create route
  app.post('/', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { name, dayOfWeek, customerPosIds } = request.body as { name: string, dayOfWeek: number, customerPosIds: string[] };
    
    // Validate pos IDs
    const pos = await prisma.customerPos.findMany({ where: { id: { in: customerPosIds }, disabledAt: null } });
    if (pos.length !== customerPosIds.length) {
      return reply.code(400).send({ error: 'Some Point of Sales do not exist or are disabled' });
    }

    const route = await prisma.route.create({
      data: {
        name,
        dayOfWeek,
        customerPos: {
          create: customerPosIds.map(posId => ({ customerPosId: posId }))
        }
      },
      include: { customerPos: true }
    });
    
    return route;
  });

  // Update route
  app.put('/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const { name, dayOfWeek, completed, customerPosIds } = request.body as any;
    
    // First, verify route
    const existing = await prisma.route.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Route not found' });

    let data: any = {};
    if (name !== undefined) data.name = name;
    if (dayOfWeek !== undefined) data.dayOfWeek = dayOfWeek;
    if (completed !== undefined) data.completed = completed;

    if (customerPosIds) {
      // Validate pos IDs
      const pos = await prisma.customerPos.findMany({ where: { id: { in: customerPosIds }, disabledAt: null } });
      if (pos.length !== customerPosIds.length) return reply.code(400).send({ error: 'Some Point of Sales do not exist or are disabled' });
    }

    try {
      const updated = await prisma.$transaction(async (tx) => {
        if (customerPosIds) {
          await tx.routeCustomerPos.deleteMany({ where: { routeId: id } });
          data.customerPos = {
            create: customerPosIds.map((posId: string) => ({ customerPosId: posId }))
          };
        }
        
        return tx.route.update({
          where: { id },
          data,
          include: { customerPos: true }
        });
      });

      return updated;
    } catch (e) {
      return reply.code(500).send({ error: 'Failed to update route' });
    }
  });

  // Delete route
  app.delete('/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.routeCustomerPos.deleteMany({ where: { routeId: id } });
        await tx.route.delete({ where: { id } });
      });
      return { success: true };
    } catch (e) {
      return reply.code(500).send({ error: 'Failed to delete route' });
    }
  });
}
