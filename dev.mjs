import { spawn } from 'node:child_process';

process.env.PORT = '3000';
process.env.HOSTNAME = '0.0.0.0';
process.env.NEXT_DIST_DIR = '.next_dev';

const nextDev = spawn('npx', ['next', 'dev', '-p', '3000', '-H', '0.0.0.0'], {
  stdio: 'inherit',
  env: process.env,
});

nextDev.on('close', (code) => {
  process.exit(code || 0);
});
