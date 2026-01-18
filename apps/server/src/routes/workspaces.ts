// Workspace Routes

import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllWorkspaces,
  getWorkspaceById,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
} from '../db.js';
import type {
  Workspace,
  CreateWorkspacePayload,
  UpdateWorkspacePayload,
  ApiResponse,
} from '@trinetra/shared';

export async function workspaceRoutes(fastify: FastifyInstance): Promise<void> {
  // List all workspaces
  fastify.get<{ Reply: ApiResponse<Workspace[]> }>('/workspaces', async (_request, reply) => {
    try {
      const workspaces = getAllWorkspaces();
      return reply.send({ success: true, data: workspaces });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to list workspaces' });
    }
  });

  // Get workspace by ID
  fastify.get<{ Params: { id: string }; Reply: ApiResponse<Workspace> }>(
    '/workspaces/:id',
    async (request, reply) => {
      try {
        const workspace = getWorkspaceById(request.params.id);
        if (!workspace) {
          return reply.status(404).send({ success: false, error: 'Workspace not found' });
        }
        return reply.send({ success: true, data: workspace });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Failed to get workspace' });
      }
    }
  );

  // Create workspace
  fastify.post<{ Body: CreateWorkspacePayload; Reply: ApiResponse<Workspace> }>(
    '/workspaces',
    async (request, reply) => {
      try {
        const { name, path, defaultTemplateId, envHint } = request.body;

        if (!name || !path) {
          return reply.status(400).send({ success: false, error: 'Name and path are required' });
        }

        const id = uuidv4();
        const workspace = createWorkspace(id, { name, path, defaultTemplateId, envHint });
        return reply.status(201).send({ success: true, data: workspace });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Failed to create workspace' });
      }
    }
  );

  // Update workspace
  fastify.put<{ Params: { id: string }; Body: UpdateWorkspacePayload; Reply: ApiResponse<Workspace> }>(
    '/workspaces/:id',
    async (request, reply) => {
      try {
        const workspace = updateWorkspace(request.params.id, request.body);
        if (!workspace) {
          return reply.status(404).send({ success: false, error: 'Workspace not found' });
        }
        return reply.send({ success: true, data: workspace });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Failed to update workspace' });
      }
    }
  );

  // Delete workspace
  fastify.delete<{ Params: { id: string }; Reply: ApiResponse<void> }>(
    '/workspaces/:id',
    async (request, reply) => {
      try {
        const deleted = deleteWorkspace(request.params.id);
        if (!deleted) {
          return reply.status(404).send({ success: false, error: 'Workspace not found' });
        }
        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Failed to delete workspace' });
      }
    }
  );
}
