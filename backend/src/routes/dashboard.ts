import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';

function getStartDate(range: string) {
  const now = new Date();
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  switch (range) {
    case 'this-week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate.setDate(diff);
      break;
    }
    case 'this-month':
      startDate.setDate(1);
      break;
    case 'this-year':
      startDate.setMonth(0, 1);
      break;
    case 'last-7-days':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'last-14-days':
      startDate.setDate(now.getDate() - 14);
      break;
    case 'last-30-days':
      startDate.setDate(now.getDate() - 30);
      break;
    case 'last-90-days':
      startDate.setDate(now.getDate() - 90);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }
  return startDate;
}

export default async function dashboardRoutes(app: FastifyInstance) {
  app.get('/sales-by-customer', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { range } = request.query as { range: string };
    const startDate = getStartDate(range);

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: startDate } },
      select: {
        id: true,
        customerPos: {
          select: {
            customerId: true,
            customer: { select: { id: true, name: true } }
          }
        },
        products: {
          select: {
            quantity: true,
            product: { select: { price: true } }
          }
        }
      }
    });

    const customerMap = new Map<string, { customerId: string; customerName: string; totalSales: number; totalAmount: number }>();

    for (const sale of sales) {
      const customerId = sale.customerPos.customerId;
      const customerName = sale.customerPos.customer.name;

      let saleAmount = 0;
      for (const sp of sale.products) {
        saleAmount += sp.quantity * sp.product.price;
      }

      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, { customerId, customerName, totalSales: 0, totalAmount: 0 });
      }

      const entry = customerMap.get(customerId)!;
      entry.totalSales += 1;
      entry.totalAmount += saleAmount;
    }

    return Array.from(customerMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount);
  });

  app.get('/sales-by-product', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { range } = request.query as { range: string };
    const startDate = getStartDate(range);

    const [grouped, products] = await Promise.all([
      prisma.saleProduct.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        where: { sale: { createdAt: { gte: startDate } } }
      }),
      prisma.product.findMany({ select: { id: true, name: true, price: true } })
    ]);

    const productMap = new Map(products.map(p => [p.id, p]));

    return grouped
      .map(g => {
        const p = productMap.get(g.productId);
        const totalQuantity = g._sum.quantity ?? 0;
        return {
          productId: g.productId,
          productName: p?.name ?? '',
          totalQuantity,
          totalAmount: totalQuantity * (p?.price ?? 0)
        };
      })
      .filter(item => item.totalQuantity > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount);
  });

  app.get('/sales-summary', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { range } = request.query as { range: string };
    const startDate = getStartDate(range);

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: startDate } },
      select: {
        products: {
          select: {
            quantity: true,
            product: { select: { price: true } }
          }
        }
      }
    });

    const totalSales = sales.length;
    let totalAmount = 0;

    for (const sale of sales) {
      let saleAmount = 0;
      for (const sp of sale.products) {
        saleAmount += sp.quantity * sp.product.price;
      }
      totalAmount += saleAmount;
    }

    const averageAmount = totalSales > 0 ? totalAmount / totalSales : 0;

    return { totalSales, totalAmount, averageAmount };
  });
}
