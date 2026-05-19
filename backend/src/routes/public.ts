import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';

type PosClosestResponse = {
  id: string;
  address: string;
  lat: number;
  lng: number;
  lastBuyingDate: Date | null;
  distanceKm: number;
};

const earthRadiusKm = 6371;

const degreesToRadians = (value: number): number => (value * Math.PI) / 180;

const calculateDistanceKm = (originLat: number, originLng: number, destinationLat: number, destinationLng: number): number => {
  const deltaLat = degreesToRadians(destinationLat - originLat);
  const deltaLng = degreesToRadians(destinationLng - originLng);
  const originLatRad = degreesToRadians(originLat);
  const destinationLatRad = degreesToRadians(destinationLat);

  const haversineComponent = (
    Math.sin(deltaLat / 2) ** 2
    + Math.cos(originLatRad) * Math.cos(destinationLatRad) * Math.sin(deltaLng / 2) ** 2
  );

  const arc = 2 * Math.atan2(Math.sqrt(haversineComponent), Math.sqrt(1 - haversineComponent));
  return earthRadiusKm * arc;
};

export default async function publicRoutes(app: FastifyInstance) {
  app.get('/pos/closest', async (request, reply) => {
    const { lat, lng } = request.query as { lat?: string; lng?: string };
    if (lat === undefined || lng === undefined) {
      return reply.code(400).send({ error: 'lat and lng query parameters are required' });
    }

    const referenceLat = Number(lat);
    const referenceLng = Number(lng);

    if (!Number.isFinite(referenceLat) || !Number.isFinite(referenceLng)) {
      return reply.code(400).send({ error: 'lat and lng query parameters must be valid numbers' });
    }

    const activePosList = await prisma.customerPos.findMany({
      where: {
        disabledAt: null,
        lat: { not: null },
        lng: { not: null },
        customer: { disabledAt: null }
      },
      select: {
        id: true,
        address: true,
        lat: true,
        lng: true,
        sales: {
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const closestPos = activePosList
      .map((pos): PosClosestResponse => {
        const posLat = pos.lat as number;
        const posLng = pos.lng as number;
        return {
          id: pos.id,
          address: pos.address,
          lat: posLat,
          lng: posLng,
          lastBuyingDate: pos.sales[0]?.createdAt ?? null,
          distanceKm: calculateDistanceKm(referenceLat, referenceLng, posLat, posLng)
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 10);

    return closestPos;
  });
}
