module.exports = {
  apps: [
    {
      name: 'muiru-tick-frontend',
      exec_mode: 'fork',
      script: '.output/server/index.mjs',
      interpreter: 'node',
      cwd: process.env.DEPLOY_DIR || '/apps/muiru/muiru-tick/frontend-current',
      max_memory_restart: '512M',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      kill_timeout: 15000,
      env: { NODE_ENV: 'production', PORT: '7790' },
    },
  ],
}
