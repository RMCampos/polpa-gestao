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
  app.post('/', { preValidation: [app.requireAdmin] }, async (request, reply) => {
    const {
      customerPosId,
      paymentMethod,
      paymentDueDate,
      paymentDate,
      comments,
      nextVisitDate,
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
            nextVisitDate: nextVisitDate ? new Date(nextVisitDate) : null,
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

  // Update sale (e.g. mark as paid, edit fields, replace products)
  app.put('/:id', { preValidation: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as any;
    const {
      customerPosId,
      delivered,
      paymentMethod,
      paymentDueDate,
      paymentDate,
      comments,
      nextVisitDate,
      visitedAt,
      products
    } = request.body as any;

    try {
      const existing = await prisma.sale.findUnique({
        where: { id },
        include: { products: true }
      });
      if (!existing) return reply.code(404).send({ error: 'Sale not found' });

      if (customerPosId !== undefined) {
        const pos = await prisma.customerPos.findUnique({ where: { id: customerPosId } });
        if (!pos || pos.disabledAt) return reply.code(400).send({ error: 'Point of sale not found or disabled' });
      }

      let data: any = {};
      const parsedDelivered = parseBoolean(delivered);
      if (parsedDelivered !== undefined) data.delivered = parsedDelivered;
      if (customerPosId !== undefined) data.customerPosId = customerPosId;
      if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
      if (paymentDueDate !== undefined) data.paymentDueDate = paymentDueDate ? new Date(paymentDueDate) : null;
      if (paymentDate !== undefined) data.paymentDate = paymentDate ? new Date(paymentDate) : null;
      if (comments !== undefined) data.comments = comments;
      if (nextVisitDate !== undefined) data.nextVisitDate = nextVisitDate ? new Date(nextVisitDate) : null;
      if (visitedAt !== undefined) data.visitedAt = visitedAt ? new Date(visitedAt) : null;

      // If products are provided, replace the entire product list with stock management
      if (products !== undefined && !Array.isArray(products)) {
        return reply.code(400).send({ error: 'products must be an array' });
      }
      if (Array.isArray(products)) {
        // Aggregate quantities by productId to handle duplicates correctly
        const aggregatedMap = new Map<string, number>();
        for (const p of products) {
          if (!p.productId || typeof p.quantity !== 'number' || p.quantity <= 0) {
            return reply.code(400).send({ error: 'Invalid product entry' });
          }
          aggregatedMap.set(p.productId, (aggregatedMap.get(p.productId) || 0) + p.quantity);
        }
        const aggregatedProducts = Array.from(aggregatedMap.entries()).map(([productId, quantity]) => ({ productId, quantity }));

        // Validate new products exist and are enabled in a single query
        const productIds = aggregatedProducts.map(p => p.productId);
        const foundProducts = await prisma.product.findMany({ where: { id: { in: productIds } } });
        for (const p of aggregatedProducts) {
          const prod = foundProducts.find(fp => fp.id === p.productId);
          if (!prod || prod.disabledAt) return reply.code(400).send({ error: `Product ${p.productId} not found or disabled` });
        }

        const sale = await prisma.$transaction(async (tx) => {
          const lockProductIds = Array.from(
            new Set([
              ...existing.products.map((sp) => sp.productId),
              ...productIds
            ])
          ).sort();

          if (lockProductIds.length > 0) {
            // Lock all affected product rows in a deterministic order.
            await tx.$queryRaw`
              SELECT id
              FROM "Product"
              WHERE id = ANY(${lockProductIds}::uuid[])
              FOR UPDATE
            `;
          }

          // Restore stock for all existing products
          for (const sp of existing.products) {
            await tx.product.update({
              where: { id: sp.productId },
              data: { stock: { increment: sp.quantity } }
            });
          }

          // Validate stock after restoring by fetching all updated products in one query
          const updatedProds = await tx.product.findMany({ where: { id: { in: productIds } } });
          for (const p of aggregatedProducts) {
            const prod = updatedProds.find(up => up.id === p.productId);
            if (!prod || prod.stock < p.quantity) {
              throw new Error(`Not enough stock for product ${p.productId}`);
            }
          }

          // Delete old sale products and create new ones
          await tx.saleProduct.deleteMany({ where: { saleId: id } });
          if (aggregatedProducts.length > 0) {
            await tx.saleProduct.createMany({
              data: aggregatedProducts.map((p) => ({
                saleId: id,
                productId: p.productId,
                quantity: p.quantity
              }))
            });

            // Deduct stock for new products
            for (const p of aggregatedProducts) {
              await tx.product.update({
                where: { id: p.productId },
                data: { stock: { decrement: p.quantity } }
              });
            }
          }

          return tx.sale.update({
            where: { id },
            data,
            include: {
              customerPos: { include: { customer: true } },
              products: { include: { product: true } }
            }
          });
        });

        return sale;
      }

      const sale = await prisma.sale.update({
        where: { id },
        data,
        include: {
          customerPos: { include: { customer: true } },
          products: { include: { product: true } }
        }
      });
      return sale;
    } catch (e: any) {
      if (e?.message?.startsWith('Not enough stock')) {
        return reply.code(400).send({ error: e.message });
      }
      return reply.code(500).send({ error: 'Failed to update sale' });
    }
  });

  // Delete sale (hard delete)
  app.delete('/:id', { preValidation: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as any;
    try {
      const existing = await prisma.sale.findUnique({
        where: { id },
        include: { products: true }
      });
      if (!existing) return reply.code(404).send({ error: 'Sale not found' });

      await prisma.$transaction(async (tx) => {
        // Restore stock for all products in the sale
        for (const sp of existing.products) {
          await tx.product.update({
            where: { id: sp.productId },
            data: { stock: { increment: sp.quantity } }
          });
        }

        // Delete sale products then the sale itself
        await tx.saleProduct.deleteMany({ where: { saleId: id } });
        await tx.sale.delete({ where: { id } });
      });

      return { success: true };
    } catch (e) {
      return reply.code(500).send({ error: 'Failed to delete sale' });
    }
  });
}
