import http from 'node:http';
import { URL } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import type { LocalAgentCore } from './core.js';
import { AgentLifecycleManager } from './lifecycle.js';
import { Logger } from '../../../packages/shared/src/logger.js';
import type { FileEvent } from '../../../packages/shared/src/types.js';

export class IPCServer {
  private server: http.Server;
  private wss: WebSocketServer;
  private core: LocalAgentCore;
  private logger: Logger;
  private port: number;
  private host: string;
  private activeWsClients: Set<WebSocket> = new Set();

  constructor(core: LocalAgentCore, port: number = 17382, host: string = '127.0.0.1', logger: Logger) {
    this.core = core;
    this.port = port;
    this.host = host;
    this.logger = logger;

    this.server = http.createServer((req, res) => this.handleRequest(req, res));
    this.wss = new WebSocketServer({ noServer: true });

    this.server.on('upgrade', (req, socket, head) => {
      // Validate token on WebSocket upgrade handshake
      if (!this.authenticateRequest(req)) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      this.wss.handleUpgrade(req, socket, head, (ws) => {
        this.wss.emit('connection', ws, req);
      });
    });

    this.wss.on('connection', (ws) => {
      this.activeWsClients.add(ws);
      this.logger.debug('IDE / CLI client connected to Local Agent WebSocket');

      ws.on('close', () => {
        this.activeWsClients.delete(ws);
      });
    });
  }

  private authenticateRequest(req: http.IncomingMessage): boolean {
    const expectedToken = AgentLifecycleManager.getSessionToken();
    if (!expectedToken) return true; // Initial bootstrap

    const authHeader = req.headers['authorization'];
    const customHeader = req.headers['x-kavach-token'];

    if (customHeader === expectedToken) return true;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token === expectedToken) return true;
    }

    return false;
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const origin = req.headers['origin'];
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Kavach-Token');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url || '/', `http://${this.host}:${this.port}`);
    const pathname = parsedUrl.pathname;

    // Public liveness probe does not require authentication
    if (pathname === '/health' && req.method === 'GET') {
      const health = await this.core.getHealth();
      this.sendJson(res, 200, health);
      return;
    }

    // Security: Authenticate all other endpoints
    if (!this.authenticateRequest(req)) {
      this.sendJson(res, 401, {
        error: 'Unauthorized',
        message: 'Invalid or missing Kavach Agent session token.',
      });
      return;
    }

    try {
      if (pathname === '/status' && req.method === 'GET') {
        const status = await this.core.getStatus();
        this.sendJson(res, 200, status);
        return;
      }

      if (pathname === '/projects' && req.method === 'GET') {
        const projects = this.core.listProjects();
        this.sendJson(res, 200, { projects });
        return;
      }

      if (pathname === '/projects/init' && req.method === 'POST') {
        const body = await this.readBody(req);
        const result = await this.core.initProject(body.path || process.cwd(), body.name);
        this.sendJson(res, 200, result);
        return;
      }

      if (pathname.startsWith('/projects/') && req.method === 'GET') {
        const id = pathname.replace('/projects/', '');
        const project = this.core.getProject(id);
        if (!project) {
          this.sendJson(res, 404, { error: 'Project not found' });
        } else {
          this.sendJson(res, 200, project);
        }
        return;
      }

      if (pathname === '/events' && req.method === 'GET') {
        const limit = parseInt(parsedUrl.searchParams.get('limit') || '20', 10);
        const events = this.core.getRecentEvents(limit);
        this.sendJson(res, 200, { events });
        return;
      }

      if (pathname === '/config' && req.method === 'GET') {
        const config = this.core.getGlobalConfig();
        this.sendJson(res, 200, config);
        return;
      }

      if (pathname === '/config' && req.method === 'PATCH') {
        const body = await this.readBody(req);
        const updated = this.core.updateGlobalConfig(body);
        this.sendJson(res, 200, updated);
        return;
      }

      if (pathname === '/shutdown' && req.method === 'POST') {
        this.sendJson(res, 200, { message: 'Initiating graceful agent shutdown.' });
        setTimeout(() => this.core.shutdown(), 200);
        return;
      }

      this.sendJson(res, 404, { error: 'Not Found' });
    } catch (err: any) {
      this.logger.error(`IPC Handler Error: ${err.message}`);
      this.sendJson(res, 500, { error: 'Internal Error', message: err.message });
    }
  }

  public broadcastEvent(event: FileEvent): void {
    const payload = JSON.stringify({ type: 'file_event', data: event });
    for (const client of this.activeWsClients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
        } catch {}
      }
    }
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.port} is already in use by another service.`));
        } else {
          reject(err);
        }
      });

      this.server.listen(this.port, this.host, () => {
        this.logger.info(`Local IPC & WebSocket Server listening on http://${this.host}:${this.port}`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      for (const client of this.activeWsClients) {
        try { client.close(); } catch {}
      }
      this.activeWsClients.clear();
      this.wss.close(() => {
        this.server.close(() => resolve());
      });
    });
  }

  private sendJson(res: http.ServerResponse, status: number, data: any): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  private readBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1024 * 1024) {
          reject(new Error('Request payload too large (>1MB)'));
        }
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          reject(new Error('Invalid JSON payload'));
        }
      });
      req.on('error', (e) => reject(e));
    });
  }
}

