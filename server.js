import 'dotenv/config';
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import searchHandler from './api/search.js';
import sheetsHandler from './api/sheets.js';
import mtkReportHandler from './api/mtk-report.js';

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/api/search') {
      req.query = Object.fromEntries(url.searchParams.entries());
      return searchHandler(req, createJsonResponse(res));
    }

    if (url.pathname === '/api/sheets') {
      req.query = Object.fromEntries(url.searchParams.entries());
      req.body = req.method === 'POST' || req.method === 'DELETE' ? await readJsonBody(req) : {};
      return sheetsHandler(req, createJsonResponse(res));
    }

    if (url.pathname === '/api/mtk-report') {
      req.query = Object.fromEntries(url.searchParams.entries());
      return mtkReportHandler(req, createJsonResponse(res));
    }

    return serveStatic(url.pathname, res);
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'İşlem sırasında hata oluştu.' }));
  }
});

server.listen(port, host, () => {
  console.log(`MTK raporu: http://localhost:${port}/mtk-rapor`);
  getLocalIpAddresses().forEach((address) => {
    console.log(`Agdan giris: http://${address}:${port}/mtk-rapor`);
  });
  console.log(`Form No Sorgu Paneli http://localhost:${port} adresinde çalışıyor.`);
});

function createJsonResponse(res) {
  return {
    setHeader(name, value) {
      res.setHeader(name, value);
      return this;
    },
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(payload) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(payload));
    }
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(urlPath, res) {
  const routeMap = {
    '/settings': '/settings.html',
    '/test': '/test.html',
    '/mtk-rapor': '/mtk-rapor.html',
    '/mtk-rapor/': '/mtk-rapor.html'
  };
  const routedPath = routeMap[urlPath] || urlPath;
  const cleanPath = routedPath === '/' ? '/index.html' : routedPath;
  const filePath = path.normalize(path.join(publicDir, cleanPath));

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  res.writeHead(200, { 'Content-Type': getContentType(filePath) });
  fs.createReadStream(filePath).pipe(res);
}

function getContentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  return 'application/octet-stream';
}

function getLocalIpAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((item) => item && item.family === 'IPv4' && !item.internal)
    .map((item) => item.address);
}
