import fs from 'fs';
import sql from 'mssql';

let poolPromise;

export function getMtkConfig() {
  const fromJson = readJsonConfig();

  const server =
    process.env.MTK_SQL_SERVER ||
    fromJson.server;

  const database =
    process.env.MTK_SQL_DATABASE ||
    fromJson.database;

  const user =
    process.env.MTK_SQL_USER ||
    fromJson.user;

  const password =
    process.env.MTK_SQL_PASSWORD ||
    fromJson.password;

  if (!server || !database || !user || !password) {
    throw new Error(
      'MTK SQL bağlantı bilgileri eksik. MTK_SQL_SERVER, MTK_SQL_DATABASE, MTK_SQL_USER ve MTK_SQL_PASSWORD ayarlanmalı.'
    );
  }

  return {
    server,
    database,
    user,
    password,
    port: Number(process.env.MTK_SQL_PORT || fromJson.port || 1433),
    options: {
      encrypt: String(process.env.MTK_SQL_ENCRYPT || 'false') === 'true',
      trustServerCertificate: true
    },
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000
    },
    requestTimeout: 15000,
    connectionTimeout: 8000
  };
}

export async function getMtkPool() {
  if (!poolPromise) {
    const pool = new sql.ConnectionPool(getMtkConfig());
    poolPromise = withTimeout(
      pool.connect(),
      Number(process.env.MTK_SQL_CONNECT_TIMEOUT_MS || 9000),
      pool
    ).catch((error) => {
      poolPromise = undefined;
      throw error;
    });
  }

  return poolPromise;
}

export function getPublicMtkError(error) {
  const message = String(error?.message || '');

  if (message.includes('bağlantı bilgileri eksik')) {
    return message;
  }

  if (
    message.includes('ETIMEOUT') ||
    message.includes('ESOCKET') ||
    message.includes('ECONNREFUSED') ||
    message.includes('Failed to connect')
  ) {
    return 'MTK SQL sunucusuna bağlanılamadı. Sunucu, internet/VPN veya ortam değişkenlerini kontrol edin.';
  }

  return 'MTK raporu alınırken hata oluştu.';
}

function readJsonConfig() {
  if (process.env.MTK_SQL_CONFIG_JSON) {
    return JSON.parse(process.env.MTK_SQL_CONFIG_JSON);
  }

  if (
    process.env.MTK_SQL_CONFIG_PATH &&
    fs.existsSync(process.env.MTK_SQL_CONFIG_PATH)
  ) {
    return JSON.parse(
      fs.readFileSync(process.env.MTK_SQL_CONFIG_PATH, 'utf8')
    );
  }

  return {};
}

function withTimeout(promise, timeoutMs, pool) {
  let timer;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      try {
        pool.close();
      } catch {
        // Pool kapanamazsa sonraki istekte yeniden denenir.
      }

      reject(
        new Error(
          'MTK SQL bağlantısı zaman aşımına uğradı.'
        )
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}
