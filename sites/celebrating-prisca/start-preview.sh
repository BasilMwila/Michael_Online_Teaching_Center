#!/bin/bash
set -euo pipefail
cd /home/ec2-user/celebrating-prisca
npm ci --omit=dev --no-audit --no-fund
if [ ! -f .env ]; then
  node --input-type=module <<'NODE'
import {randomBytes} from 'node:crypto';
import {writeFileSync} from 'node:fs';
writeFileSync('.env', 'PORT=4100\nHOST=127.0.0.1\nADMIN_TOKEN='+randomBytes(32).toString('hex')+'\nMAX_FILE_MB=40\nMAX_STORAGE_MB=2048\n', {mode:0o600,flag:'wx'});
NODE
fi
node --check server.js
if pm2 describe prisca-diary >/dev/null 2>&1; then
  pm2 restart prisca-diary
else
  pm2 start server.js --name prisca-diary --node-args='--env-file=.env'
fi
pm2 save
curl -fsS --retry 5 --retry-connrefused --retry-delay 1 http://127.0.0.1:4100/api/health
sudo python3 deploy-preview.py
