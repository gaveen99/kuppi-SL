module.exports = {
  apps: [{
    name: 'kuppi',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/kuppi',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/www/kuppi/logs/err.log',
    out_file: '/var/www/kuppi/logs/out.log',
    log_file: '/var/www/kuppi/logs/combined.log',
    time: true
  }]
}
