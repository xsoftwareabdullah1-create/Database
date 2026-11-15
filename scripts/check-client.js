'use strict';
const fs = require('node:fs');
const vm = require('node:vm');

const pages = [
  { file: 'public/index.html', required: ['menu', 'features'] },
  { file: 'public/console.html', required: ['authForm', 'appView', 'page', 'modalRoot', 'registerApp', 'manageRules', 'createApiKey'] }
];

for (const page of pages) {
  const html = fs.readFileSync(page.file, 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
  if (!scripts.length) throw new Error('No client application script found in ' + page.file);
  for (const [index, match] of scripts.entries()) {
    new vm.Script(match[1], { filename: page.file + ':inline-script-' + index });
  }
  for (const required of page.required) {
    if (!html.includes('id="' + required + '"')) {
      throw new Error('Missing required UI element "' + required + '" in ' + page.file);
    }
  }
}
const blueprint = fs.readFileSync('render.yaml', 'utf8');
for (const required of [
  'type: web',
  'runtime: node',
  'buildCommand: npm install --omit=dev --no-audit --no-fund && npm run check',
  'startCommand: npm start',
  'healthCheckPath: /api/health',
  'key: DATABASE_URL',
  'fromDatabase:',
  'property: connectionString',
  'key: JWT_SECRET',
  'generateValue: true',
  'type: pserv',
  'plan: free'
]) {
  if (!blueprint.includes(required)) throw new Error('Missing Render deployment configuration: ' + required);
}
if (!fs.existsSync('LICENSE')) throw new Error('Apache-2.0 LICENSE file is missing.');
const backend = fs.readFileSync('server.js', 'utf8');
for (const required of ['security_rules', '/api/client/', 'clientKeyAuth']) if (!backend.includes(required)) throw new Error('Missing backend security feature: ' + required);
if (!backend.includes("replace(/^Bearer\\s+/i,'' )") && !backend.includes("replace(/^Bearer\\s+/i,'')")) throw new Error('Bearer token parsing must accept standard Authorization headers.');
console.log('Landing page, developer console, backend security and Render deployment checks passed.');
