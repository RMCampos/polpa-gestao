import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';

export default async function dashboardRoutes(app: FastifyInstance) {
  app.get('/sales-by-route', { preValidation: [app.authenticate] }, async (request, reply) => {
    // Basic aggregation: total sales per route
    const routes = await prisma.route.findMany({
      include: {
        customerPos: {
          include: { customerPos: true }
        }
      }
    });

    // To get sales by route, we need to find sales matching the POS included in each route
    // Note: a sale is tied to a POS, not directly a Route.
    const result = await Promise.all(routes.map(async (r) => {
      const posIds = r.customerPos.map(cp => cp.customerPosId);
      const sales = await prisma.sale.findMany({
        where: { customerPosId: { in: posIds } },
        include: { products: { include: { product: true } } }
      });
      
      let totalAmount = 0;
      sales.forEach(sale => {
        sale.products.forEach(sp => {
          totalAmount += sp.quantity * sp.product.price;
        });
      });

      return {
        routeId: r.id,
        routeName: r.name,
        totalSales: sales.length,
        totalAmount
      };
    }));

    return result.sort((a, b) => b.totalAmount - a.totalAmount);
  });

  app.get('/sales-by-customer', { preValidation: [app.authenticate] }, async (request, reply) => {
    const customers = await prisma.customer.findMany({
      include: { pos: true }
    });

    const result = await Promise.all(customers.map(async (c) => {
      const posIds = c.pos.map(p => p.id);
      const sales = await prisma.sale.findMany({
        where: { customerPosId: { in: posIds } },
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

    return result.sort((a, b) => b.totalAmount - a.totalAmount);
  });
}
