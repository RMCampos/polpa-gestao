import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';

type PosCoordinates = {
  lat: number | null;
  lng: number | null;
};

const parseFridgeCount = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;

  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue < 0) return 0;

  return parsedValue;
};

const parseBooleanFlag = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  return undefined;
};

const parseCoordinate = (value: unknown): number | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) return undefined;
  return parsedValue;
};

const geocodeAddress = async (address: string): Promise<PosCoordinates | null> => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !address?.trim()) return null;

  const geocodeUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  geocodeUrl.searchParams.set('address', address.trim());
  geocodeUrl.searchParams.set('key', apiKey);

  try {
    const response = await fetch(geocodeUrl.toString());
    if (!response.ok) return null;
    const data = await response.json() as {
      status?: string;
      results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
    };
    if (data.status !== 'OK' || !data.results?.length) return null;
    const location = data.results[0]?.geometry?.location;
    if (typeof location?.lat !== 'number' || typeof location?.lng !== 'number') return null;
    return { lat: location.lat, lng: location.lng };
  } catch {
    return null;
  }
};

const resolvePosCoordinates = async ({
  address,
  lat,
  lng
}: {
  address?: string;
  lat: number | null | undefined;
  lng: number | null | undefined;
}): Promise<PosCoordinates | undefined> => {
  const hasLat = lat !== undefined;
  const hasLng = lng !== undefined;

  if (hasLat || hasLng) {
    if (!hasLat || !hasLng) return undefined;
    return { lat: lat ?? null, lng: lng ?? null };
  }

  if (!address?.trim()) return undefined;

  const geocoded = await geocodeAddress(address);
  if (!geocoded) return undefined;
  return geocoded;
};

const conflictError = (message: string): Error & { statusCode: number } =>
  Object.assign(new Error(message), { statusCode: 409 });

export default async function customersRoutes(app: FastifyInstance) {
  // Get all customers (with pos optionally)
  app.get('/', { preValidation: [app.authenticate] }, async (request, reply) => {
    const showDisabled = (request.query as any).showDisabled as string === 'true';
    return prisma.customer.findMany({
      where: showDisabled ? {} : { disabledAt: null },
      include: { pos: { where: showDisabled ? {} : { disabledAt: null } } }
    });
  });

  // Get specific customer
  app.get('/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { pos: { where: { disabledAt: null } } }
    });
    if (!customer || customer.disabledAt) return reply.code(404).send({ error: 'Customer not found' });
    return customer;
  });

  // Create customer
  app.post('/', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { name, document, phone, personName } = request.body as any;
    const docValue = document || null;
    try {
      return await prisma.$transaction(async (tx) => {
        const existingByName = await tx.customer.findFirst({
          where: { name: { equals: name, mode: 'insensitive' }, disabledAt: null }
        });
        if (existingByName) throw conflictError('A customer with this name already exists');

        if (phone) {
          const existingByPhone = await tx.customer.findFirst({
            where: { phone, disabledAt: null }
          });
          if (existingByPhone) throw conflictError('A customer with this phone number already exists');
        }

        return tx.customer.create({ data: { name, document: docValue, phone, personName } });
      });
    } catch (e: any) {
      if (e.statusCode === 409) return reply.code(409).send({ error: e.message });
      if (e.code === 'P2002') return reply.code(409).send({ error: 'Document already exists' });
      throw e;
    }
  });

  // Update customer
  app.put('/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const { name, document, phone, personName } = request.body as any;
    const docValue = document || null;
    try {
      return await prisma.$transaction(async (tx) => {
        const existingByName = await tx.customer.findFirst({
          where: { name: { equals: name, mode: 'insensitive' }, disabledAt: null, id: { not: id } }
        });
        if (existingByName) throw conflictError('A customer with this name already exists');

        if (phone) {
          const existingByPhone = await tx.customer.findFirst({
            where: { phone, disabledAt: null, id: { not: id } }
          });
          if (existingByPhone) throw conflictError('A customer with this phone number already exists');
        }

        if (docValue) {
          const existingByDoc = await tx.customer.findFirst({
            where: { document: docValue, disabledAt: null, id: { not: id } }
          });
          if (existingByDoc) throw conflictError('Document already exists for another customer');
        }

        return tx.customer.update({ where: { id }, data: { name, document: docValue, phone, personName } });
      });
    } catch (e: any) {
      if (e.statusCode === 409) return reply.code(409).send({ error: e.message });
      if (e && e.code === 'P2025') {
        return reply.code(404).send({ error: 'Customer not found' });
      }
      return reply.code(400).send({ error: 'Invalid customer data' });
    }
  });

  // Delete customer (soft)
  app.delete('/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    await prisma.customer.update({ where: { id }, data: { disabledAt: new Date() } });
    return { success: true };
  });

  // --- Point of Sales for Customer ---

  app.post('/:customerId/pos', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { customerId } = request.params as any;
    const { address, phone, personName, fridgeCount, banner, indiBanner, lat, lng } = request.body as any;
    const parsedLat = parseCoordinate(lat);
    const parsedLng = parseCoordinate(lng);

    if (lat !== undefined && parsedLat === undefined) return reply.code(400).send({ error: 'Invalid lat coordinate' });
    if (lng !== undefined && parsedLng === undefined) return reply.code(400).send({ error: 'Invalid lng coordinate' });

    const coordinates = await resolvePosCoordinates({ address, lat: parsedLat, lng: parsedLng });
    if ((parsedLat !== undefined || parsedLng !== undefined) && !coordinates) {
      return reply.code(400).send({ error: 'Both lat and lng must be provided together' });
    }

    try {
      return await prisma.$transaction(async (tx) => {
        if (phone) {
          const existingByPhone = await tx.customerPos.findFirst({
            where: { phone, disabledAt: null }
          });
          if (existingByPhone) throw conflictError('A point of sale with this phone number already exists');
        }
        return tx.customerPos.create({
          data: {
            customerId,
            address,
            phone,
            personName,
            fridgeCount: parseFridgeCount(fridgeCount) ?? 0,
            banner: parseBooleanFlag(banner) ?? false,
            indiBanner: parseBooleanFlag(indiBanner) ?? false,
            ...(coordinates ? { lat: coordinates.lat, lng: coordinates.lng } : {})
          }
        });
      });
    } catch (e: any) {
      if (e.statusCode === 409) return reply.code(409).send({ error: e.message });
      throw e;
    }
  });

  app.put('/pos/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const { address, phone, personName, fridgeCount, banner, indiBanner, lat, lng } = request.body as any;
    const normalizedFridgeCount = parseFridgeCount(fridgeCount);
    const normalizedBanner = parseBooleanFlag(banner);
    const normalizedIndiBanner = parseBooleanFlag(indiBanner);
    const parsedLat = parseCoordinate(lat);
    const parsedLng = parseCoordinate(lng);

    if (lat !== undefined && parsedLat === undefined) return reply.code(400).send({ error: 'Invalid lat coordinate' });
    if (lng !== undefined && parsedLng === undefined) return reply.code(400).send({ error: 'Invalid lng coordinate' });

    const coordinates = await resolvePosCoordinates({ address, lat: parsedLat, lng: parsedLng });
    if ((parsedLat !== undefined || parsedLng !== undefined) && !coordinates) {
      return reply.code(400).send({ error: 'Both lat and lng must be provided together' });
    }

    try {
      return await prisma.$transaction(async (tx) => {
        if (phone) {
          const existingByPhone = await tx.customerPos.findFirst({
            where: { phone, disabledAt: null, id: { not: id } }
          });
          if (existingByPhone) throw conflictError('A point of sale with this phone number already exists');
        }
        return tx.customerPos.update({
          where: { id },
          data: {
            address,
            phone,
            personName,
            ...(normalizedFridgeCount !== undefined ? { fridgeCount: normalizedFridgeCount } : {}),
            ...(normalizedBanner !== undefined ? { banner: normalizedBanner } : {}),
            ...(normalizedIndiBanner !== undefined ? { indiBanner: normalizedIndiBanner } : {}),
            ...(coordinates ? { lat: coordinates.lat, lng: coordinates.lng } : {})
          }
        });
      });
    } catch (e: any) {
      if (e.statusCode === 409) return reply.code(409).send({ error: e.message });
      throw e;
    }
  });

  app.delete('/pos/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    await prisma.customerPos.update({
      where: { id },
      data: { disabledAt: new Date() }
    });
    return { success: true };
  });
}
