import fs from 'node:fs';
import path from 'node:path';

const standaloneServer = path.join(process.cwd(), '.next', 'standalone', 'server.js');

if (fs.existsSync(standaloneServer)) {
  await import(standaloneServer);
} else {
  const { createServer } = await import('node:http');
  const { parse } = await import('node:url');
  const { default: next } = await import('next');

  const port = parseInt(process.env.PORT || '3000', 10);
  const hostname = '0.0.0.0';
  const dev = process.env.NODE_ENV !== 'production';

  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || '/', true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  server.listen(port, hostname, () => {
    console.log(`> Server ready on http://${hostname}:${port}`);
  });
}
