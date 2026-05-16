import { createServer } from 'http';
import { parse } from 'url';
import { pathToFileURL } from 'url';

import next from 'next';
import { WebSocketServer } from 'ws';

import { handleVoiceLiveSocket } from './src/lib/voice/live-bridge';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 3000);

export async function startServer() {
  const app = next({ dev, hostname, port });

  await app.prepare();

  const handle = app.getRequestHandler();
  const upgradeHandler = app.getUpgradeHandler();

  const liveBridgeServer = new WebSocketServer({ noServer: true });
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || '/', true);
    void handle(req, res, parsedUrl);
  });

  liveBridgeServer.on('connection', (socket, request) => {
    void handleVoiceLiveSocket(socket, request);
  });

  server.on('upgrade', async (request, socket, head) => {
    try {
      const pathname = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`).pathname;

      if (pathname === '/api/voice/live') {
        liveBridgeServer.handleUpgrade(request, socket, head, (client) => {
          liveBridgeServer.emit('connection', client, request);
        });
        return;
      }

      await upgradeHandler(request, socket, head);
    } catch (error) {
      socket.destroy();
      console.error('Upgrade request failed:', error);
    }
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}

const isDirectExecution = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;

if (process.env.RUN_CUSTOM_SERVER === '1' || isDirectExecution) {
  startServer().catch((error) => {
    console.error('Failed to start custom server:', error);
    process.exit(1);
  });
}