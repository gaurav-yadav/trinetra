// Session Routes

import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import {
  getAllSessions,
  getSessionById,
  getSessionByTmuxSession,
  createSession as dbCreateSession,
  updateSessionStatus,
  updateSessionTitle,
  deleteSession,
  getWorkspaceById,
  getTemplateById,
} from '../db.js';
import * as tmux from '../tmux.js';
import { FileTailer } from '../tailer.js';
import {
  SessionStatus,
  SessionPhase,
  type Session,
  type SessionWithDetails,
  type CreateSessionPayload,
  type RenameSessionPayload,
  type ApiResponse,
} from '@trinetra/shared';

export function createSessionRoutes(dataDir: string) {
  return async function sessionRoutes(fastify: FastifyInstance): Promise<void> {
    // List all sessions (merge DB + discovered tmux sessions)
    fastify.get<{ Reply: ApiResponse<Session[]> }>('/sessions', async (_request, reply) => {
      try {
        // Get sessions from DB
        const dbSessions = getAllSessions();
        const dbSessionMap = new Map(dbSessions.map((s) => [s.tmuxSession, s]));

        // Get active tmux sessions
        const tmuxSessions = await tmux.listSessions();

        // Merge: Update status of DB sessions based on tmux
        const result: Session[] = [];
        const seenTmuxSessions = new Set<string>();

        for (const session of dbSessions) {
          const isRunning = tmuxSessions.includes(session.tmuxSession);
          seenTmuxSessions.add(session.tmuxSession);

          if (isRunning && session.status === SessionStatus.EXITED) {
            // Session is back, update status
            updateSessionStatus(session.id, SessionStatus.RUNNING);
            result.push({ ...session, status: SessionStatus.RUNNING });
          } else if (!isRunning && session.status === SessionStatus.RUNNING) {
            // Session is gone, update status
            updateSessionStatus(session.id, SessionStatus.EXITED);
            result.push({ ...session, status: SessionStatus.EXITED });
          } else {
            result.push(session);
          }
        }

        // Add discovered tmux sessions not in DB
        for (const tmuxSession of tmuxSessions) {
          if (!seenTmuxSessions.has(tmuxSession)) {
            result.push({
              id: tmuxSession,
              tmuxSession,
              title: tmuxSession,
              status: SessionStatus.RUNNING,
              activePane: '0.0',
              createdAt: new Date().toISOString(),
              lastActivityAt: new Date().toISOString(),
              discovered: true,
            });
          }
        }

        return reply.send({ success: true, data: result });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Failed to list sessions' });
      }
    });

    // Get session details with windows/panes
    fastify.get<{ Params: { id: string }; Reply: ApiResponse<SessionWithDetails> }>(
      '/sessions/:id',
      async (request, reply) => {
        try {
          let session = getSessionById(request.params.id);

          // Maybe it's a discovered session (tmux session name)
          if (!session) {
            session = getSessionByTmuxSession(request.params.id);
          }

          // Check if it exists in tmux directly
          const tmuxSessions = await tmux.listSessions();
          const tmuxSessionName = session?.tmuxSession ?? request.params.id;

          if (!tmuxSessions.includes(tmuxSessionName)) {
            return reply.status(404).send({ success: false, error: 'Session not found or not running' });
          }

          // Get windows and panes
          const windows = await tmux.getSessionInfo(tmuxSessionName);

          // Build response
          const workspace = session?.workspaceId ? getWorkspaceById(session.workspaceId) : undefined;

          const response: SessionWithDetails = {
            id: session?.id ?? tmuxSessionName,
            tmuxSession: tmuxSessionName,
            workspaceId: session?.workspaceId,
            title: session?.title ?? tmuxSessionName,
            status: SessionStatus.RUNNING,
            phase: session?.phase,
            activePane: session?.activePane ?? '0.0',
            createdAt: session?.createdAt ?? new Date().toISOString(),
            lastActivityAt: session?.lastActivityAt ?? new Date().toISOString(),
            workspace: workspace ?? undefined,
            windows,
          };

          return reply.send({ success: true, data: response });
        } catch (error) {
          fastify.log.error(error);
          return reply.status(500).send({ success: false, error: 'Failed to get session details' });
        }
      }
    );

    // Create new session
    fastify.post<{ Body: CreateSessionPayload; Reply: ApiResponse<Session> }>(
      '/sessions',
      async (request, reply) => {
        try {
          const { workspaceId, templateId, title, pathOverride } = request.body;

          // Determine path
          let sessionPath = pathOverride;
          let workspace;
          if (workspaceId) {
            workspace = getWorkspaceById(workspaceId);
            if (!workspace) {
              return reply.status(400).send({ success: false, error: 'Workspace not found' });
            }
            if (!sessionPath) {
              sessionPath = workspace.path;
            }
          }

          // Default path to home directory
          if (!sessionPath) {
            sessionPath = process.env.HOME || '/tmp';
          }

          // Get template if provided
          let template;
          if (templateId) {
            template = getTemplateById(templateId);
            if (!template) {
              return reply.status(400).send({ success: false, error: 'Template not found' });
            }
          }

          // Generate session ID and tmux session name
          const id = uuidv4();
          const shortId = id.split('-')[0];
          const tmuxSessionName = `ccp_${shortId}`;
          const sessionTitle = title || template?.name || workspace?.name || `Session ${shortId}`;

          // Create tmux session
          await tmux.createSession(tmuxSessionName, sessionPath);

          // Create log directory
          const logDir = path.join(dataDir, 'logs', id);
          if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
          }

          // Setup pipe-pane for logging
          const logPath = FileTailer.getLogPath(dataDir, id, '0.0');
          fs.writeFileSync(logPath, ''); // Create empty log file
          await tmux.pipePaneToFile(`${tmuxSessionName}:0.0`, logPath);

          // Create DB record
          const session = dbCreateSession(
            id,
            tmuxSessionName,
            sessionTitle,
            SessionStatus.RUNNING,
            workspaceId,
            SessionPhase.IDLE
          );

          // Run pre-commands if template has them
          if (template?.preCommands && template.preCommands.length > 0) {
            for (const cmd of template.preCommands) {
              await tmux.sendCommand(`${tmuxSessionName}:0.0`, cmd);
              // Small delay between commands
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          }

          // Run main command if template is autoRun
          if (template?.autoRun && template.command) {
            await tmux.sendCommand(`${tmuxSessionName}:0.0`, template.command);
          }

          return reply.status(201).send({ success: true, data: session });
        } catch (error) {
          fastify.log.error(error);
          return reply.status(500).send({ success: false, error: 'Failed to create session' });
        }
      }
    );

    // Kill session
    fastify.post<{ Params: { id: string }; Reply: ApiResponse<void> }>(
      '/sessions/:id/kill',
      async (request, reply) => {
        try {
          const session = getSessionById(request.params.id);
          const tmuxSessionName = session?.tmuxSession ?? request.params.id;

          try {
            await tmux.killSession(tmuxSessionName);
          } catch {
            // Session may already be dead
          }

          if (session) {
            updateSessionStatus(session.id, SessionStatus.EXITED);
          }

          return reply.send({ success: true });
        } catch (error) {
          fastify.log.error(error);
          return reply.status(500).send({ success: false, error: 'Failed to kill session' });
        }
      }
    );

    // Rename session
    fastify.post<{ Params: { id: string }; Body: RenameSessionPayload; Reply: ApiResponse<Session> }>(
      '/sessions/:id/rename',
      async (request, reply) => {
        try {
          const { title } = request.body;
          if (!title) {
            return reply.status(400).send({ success: false, error: 'Title is required' });
          }

          const session = getSessionById(request.params.id);
          if (!session) {
            return reply.status(404).send({ success: false, error: 'Session not found' });
          }

          updateSessionTitle(session.id, title);
          const updated = getSessionById(session.id);

          return reply.send({ success: true, data: updated! });
        } catch (error) {
          fastify.log.error(error);
          return reply.status(500).send({ success: false, error: 'Failed to rename session' });
        }
      }
    );

    // Capture pane snapshot
    fastify.get<{
      Params: { id: string; paneKey: string };
      Querystring: { lines?: string };
      Reply: ApiResponse<{ text: string }>;
    }>('/sessions/:id/panes/:paneKey/snapshot', async (request, reply) => {
      try {
        const session = getSessionById(request.params.id);
        const tmuxSessionName = session?.tmuxSession ?? request.params.id;
        const paneKey = request.params.paneKey;
        const lines = parseInt(request.query.lines || '2000', 10);

        const target = `${tmuxSessionName}:${paneKey}`;
        const text = await tmux.capturePane(target, lines);

        return reply.send({ success: true, data: { text } });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Failed to capture pane' });
      }
    });
  };
}
