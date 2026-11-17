'use strict';

/* PM2
 *   npm run pm2:start      başlat (production)
 *   npm run pm2:restart    sıfır kesintiyle yeniden yükle
 *   npm run pm2:logs       loglar
 *   npx pm2 save && npx pm2 startup   sunucu açılınca otomatik başlasın
 * PORT ve diğer ayarlar .env dosyasından okunur (server.js → dotenv). */
module.exports = {
  apps: [
    {
      name: 'cv-world',
      script: 'server.js',
      cwd: __dirname,
      /* multiplayer state lives in memory: keep one process (cluster would split the players) */
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 2000,
      max_memory_restart: '512M',
      kill_timeout: 5000,
      watch: false,
      time: true,
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      merge_logs: true,
      env: { NODE_ENV: 'development' },
      env_production: { NODE_ENV: 'production' },
    },
  ],
};
