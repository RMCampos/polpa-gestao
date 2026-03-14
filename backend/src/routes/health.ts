import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';

export default async function healthRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    const buildVersion = process.env.BUILD_VERSION;
    let database: "UP" | "DOWN";

    try {
      await prisma.$queryRaw`SELECT 1`;
      database = "UP";
    } catch (e) {
      database = "DOWN";
    }

    return {
      status: "UP",
      database,
      version: buildVersion,
    };
  });
}
