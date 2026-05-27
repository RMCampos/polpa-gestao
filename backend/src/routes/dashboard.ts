import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';

function getDateRange(range: string): { startDate: Date; endDate: Date | null } {
  const now = new Date();
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  let endDate: Date | null = null;

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
    case 'past-week': {
      const day = now.getDay();
      const daysSinceMonday = day === 0 ? 6 : day - 1;
      const lastMonday = new Date(now);
      lastMonday.setDate(now.getDate() - daysSinceMonday - 7);
      lastMonday.setHours(0, 0, 0, 0);
      startDate.setTime(lastMonday.getTime());
      endDate = new Date(lastMonday);
      endDate.setDate(lastMonday.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case 'past-month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      firstDay.setHours(0, 0, 0, 0);
      startDate.setTime(firstDay.getTime());
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case 'past-year': {
      const firstDay = new Date(now.getFullYear() - 1, 0, 1);
      firstDay.setHours(0, 0, 0, 0);
      startDate.setTime(firstDay.getTime());
      endDate = new Date(now.getFullYear() - 1, 11, 31);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    default:
      startDate.setDate(now.getDate() - 30);
  }
  return { startDate, endDate };
}

export default async function dashboardRoutes(app: FastifyInstance) {
  app.get('/sales-by-customer', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { range } = request.query as { range: string };
    const { startDate, endDate } = getDateRange(range);

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: startDate, ...(endDate ? { lte: endDate } : {}) } },
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
    const { startDate, endDate } = getDateRange(range);

    const [grouped, products] = await Promise.all([
      prisma.saleProduct.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        where: { sale: { createdAt: { gte: startDate, ...(endDate ? { lte: endDate } : {}) } } }
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
    const { startDate, endDate } = getDateRange(range);

    const [sales, totalCustomers, totalFridges] = await Promise.all([
      prisma.sale.findMany({
        where: { createdAt: { gte: startDate, ...(endDate ? { lte: endDate } : {}) } },
        select: {
          products: {
            select: {
              quantity: true,
              product: { select: { price: true } }
            }
          }
        }
      }),
      prisma.customer.count({ where: { disabledAt: null } }),
      prisma.customerPos.aggregate({
        _sum: { fridgeCount: true },
        where: { disabledAt: null }
      })
    ]);

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

    return {
      totalSales,
      totalAmount,
      averageAmount,
      totalCustomers,
      totalFridges: totalFridges._sum.fridgeCount ?? 0
    };
  });

  app.get('/fridges', { preValidation: [app.authenticate] }, async () => {
    return prisma.customerPos.findMany({
      where: {
        disabledAt: null,
        fridgeCount: { gt: 0 }
      },
      select: {
        id: true,
        address: true,
        fridgeCount: true,
        customer: { select: { name: true } }
      },
      orderBy: [
        { customer: { name: 'asc' } },
        { address: 'asc' }
      ]
    });
  });

  app.get('/industries-summary', { preValidation: [app.authenticate] }, async () => {
    const grouped = await prisma.customerPos.groupBy({
      by: ['industry'],
      _count: { _all: true },
      where: { disabledAt: null }
    });

    const fallbackIndustry = 'Não Informado';
    const summaryMap = new Map<string, number>();

    for (const item of grouped) {
      const normalizedIndustry = item.industry?.trim() || fallbackIndustry;
      summaryMap.set(normalizedIndustry, (summaryMap.get(normalizedIndustry) ?? 0) + item._count._all);
    }

    return Array.from(summaryMap.entries())
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count);
  });
}
