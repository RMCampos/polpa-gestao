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

    const customers = await prisma.customer.findMany({
      include: { pos: true }
    });

    const result = await Promise.all(customers.map(async (c) => {
      const posIds = c.pos.map(p => p.id);
      const sales = await prisma.sale.findMany({
        where: { 
          customerPosId: { in: posIds },
          createdAt: { gte: startDate }
        },
        include: { products: { include: { product: true } } }
      });
      
      let totalAmount = 0;
      sales.forEach(sale => {
        sale.products.forEach(sp => {
          totalAmount += sp.quantity * sp.product.price;
        });
      });

      return {
        customerId: c.id,
        customerName: c.name,
        totalSales: sales.length,
        totalAmount
      };
    }));

    return result
      .filter(item => item.totalSales > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount);
  });

  app.get('/sales-by-product', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { range } = request.query as { range: string };
    const startDate = getStartDate(range);

    const products = await prisma.product.findMany();

    const result = await Promise.all(products.map(async (p) => {
      const saleProducts = await prisma.saleProduct.findMany({
        where: {
          productId: p.id,
          createdAt: { gte: startDate }
        }
      });

      let totalQuantity = 0;
      saleProducts.forEach(sp => {
        totalQuantity += sp.quantity;
      });

      return {
        productId: p.id,
        productName: p.name,
        totalQuantity,
        totalAmount: totalQuantity * p.price
      };
    }));

    return result
      .filter(item => item.totalQuantity > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount);
  });
}
