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

export default async function salesRoutes(app: FastifyInstance) {
  // Get all sales
  app.get('/', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { showDelivered } = request.query as any;
    const parsedShowDelivered = parseBoolean(showDelivered);

    return prisma.sale.findMany({
      where: parsedShowDelivered !== undefined ? { delivered: parsedShowDelivered } : undefined,
      include: {
        customerPos: { include: { customer: true } },
        products: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  });

  // Get specific sale
  app.get('/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        customerPos: { include: { customer: true } },
        products: { include: { product: true } }
      }
    });
    if (!sale) return reply.code(404).send({ error: 'Sale not found' });
    return sale;
  });

  // Create sale
  app.post('/', { preValidation: [app.authenticate] }, async (request, reply) => {
    const {
      customerPosId,
      paymentMethod,
      paymentDueDate,
      paymentDate,
      comments,
      products // Array of { productId, quantity }
    } = request.body as any;

    try {
      // Validate customerPos
      const pos = await prisma.customerPos.findUnique({ where: { id: customerPosId } });
      if (!pos || pos.disabledAt) return reply.code(400).send({ error: 'Point of sale not found or disabled' });

      // Validate products and check stock
      for (const p of products) {
        const prod = await prisma.product.findUnique({ where: { id: p.productId } });
        if (!prod || prod.disabledAt) return reply.code(400).send({ error: `Product ${p.productId} not found or disabled` });
        if (prod.stock < p.quantity) return reply.code(400).send({ error: `Not enough stock for product ${prod.name}` });
      }

      const sale = await prisma.$transaction(async (tx) => {
        const s = await tx.sale.create({
          data: {
            customerPosId,
            paymentMethod,
            paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : null,
            paymentDate: paymentDate ? new Date(paymentDate) : null,
            comments,
            products: {
              create: products.map((p: any) => ({
                productId: p.productId,
                quantity: p.quantity
              }))
            }
          },
          include: {
            customerPos: true,
            products: true
          }
        });

        // Deduct stock
        for (const p of products) {
          await tx.product.update({
            where: { id: p.productId },
            data: { stock: { decrement: p.quantity } }
          });
        }

        return s;
      });

      return sale;
    } catch (e) {
      return reply.code(500).send({ error: 'Failed to create sale' });
    }
  });

  // Update sale (e.g. mark as paid)
  app.put('/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const {
      delivered,
      paymentMethod,
      paymentDueDate,
      paymentDate,
      comments
    } = request.body as any;

    try {
      const existing = await prisma.sale.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ error: 'Sale not found' });

      let data: any = {};
      const parsedDelivered = parseBoolean(delivered);
      if (parsedDelivered !== undefined) data.delivered = parsedDelivered;
      if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
      if (paymentDueDate !== undefined) data.paymentDueDate = paymentDueDate ? new Date(paymentDueDate) : null;
      if (paymentDate !== undefined) data.paymentDate = paymentDate ? new Date(paymentDate) : null;
      if (comments !== undefined) data.comments = comments;

      const sale = await prisma.sale.update({
        where: { id },
        data,
        include: {
          customerPos: { include: { customer: true } },
          products: { include: { product: true } }
        }
      });
      return sale;
    } catch (e) {
      return reply.code(500).send({ error: 'Failed to update sale' });
    }
  });
}
