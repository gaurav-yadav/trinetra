// Template Routes

import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../db.js';
import type {
  Template,
  CreateTemplatePayload,
  UpdateTemplatePayload,
  ApiResponse,
} from '@trinetra/shared';

export async function templateRoutes(fastify: FastifyInstance): Promise<void> {
  // List all templates
  fastify.get<{ Reply: ApiResponse<Template[]> }>('/templates', async (_request, reply) => {
    try {
      const templates = getAllTemplates();
      return reply.send({ success: true, data: templates });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to list templates' });
    }
  });

  // Get template by ID
  fastify.get<{ Params: { id: string }; Reply: ApiResponse<Template> }>(
    '/templates/:id',
    async (request, reply) => {
      try {
        const template = getTemplateById(request.params.id);
        if (!template) {
          return reply.status(404).send({ success: false, error: 'Template not found' });
        }
        return reply.send({ success: true, data: template });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Failed to get template' });
      }
    }
  );

  // Create template
  fastify.post<{ Body: CreateTemplatePayload; Reply: ApiResponse<Template> }>(
    '/templates',
    async (request, reply) => {
      try {
        const { name, command, autoRun, shell, preCommands, postCommands } = request.body;

        if (!name || !command) {
          return reply.status(400).send({ success: false, error: 'Name and command are required' });
        }

        const id = uuidv4();
        const template = createTemplate(id, { name, command, autoRun, shell, preCommands, postCommands });
        return reply.status(201).send({ success: true, data: template });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Failed to create template' });
      }
    }
  );

  // Update template
  fastify.put<{ Params: { id: string }; Body: UpdateTemplatePayload; Reply: ApiResponse<Template> }>(
    '/templates/:id',
    async (request, reply) => {
      try {
        const template = updateTemplate(request.params.id, request.body);
        if (!template) {
          return reply.status(404).send({ success: false, error: 'Template not found' });
        }
        return reply.send({ success: true, data: template });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Failed to update template' });
      }
    }
  );

  // Delete template
  fastify.delete<{ Params: { id: string }; Reply: ApiResponse<void> }>(
    '/templates/:id',
    async (request, reply) => {
      try {
        const deleted = deleteTemplate(request.params.id);
        if (!deleted) {
          return reply.status(404).send({ success: false, error: 'Template not found' });
        }
        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Failed to delete template' });
      }
    }
  );
}
