import { FastifyInstance } from 'fastify';

export default async function proxyRoutes(app: FastifyInstance) {
  app.get('/validator', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { value } = request.query as { value?: string };
    if (!value) {
      return reply.code(400).send({ error: 'value query parameter is required' });
    }

    const token = process.env.CPF_CNPJ_API_TOKEN;
    if (!token) {
      return reply.code(500).send({ error: 'CPF_CNPJ_API_TOKEN is not configured on the server' });
    }

    try {
      const response = await fetch(`https://api.invertexto.com/v1/validator?token=${encodeURIComponent(token)}&value=${encodeURIComponent(value)}`);
      if (!response.ok) {
        return reply.code(response.status).send({ error: 'Failed to validate document via proxy' });
      }
      const data = await response.json();
      return data;
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ error: 'Error calling validation API' });
    }
  });

  app.get('/geocode', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { address } = request.query as { address?: string };
    if (!address) {
      return reply.code(400).send({ error: 'address query parameter is required' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return reply.code(500).send({ error: 'GOOGLE_MAPS_API_KEY is not configured on the server' });
    }

    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`);
      if (!response.ok) {
        return reply.code(response.status).send({ error: 'Failed to geocode address via proxy' });
      }
      const data = await response.json();
      return data;
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ error: 'Error calling geocoding API' });
    }
  });
}
