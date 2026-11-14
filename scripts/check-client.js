'use strict';
const fs = require('node:fs');
const vm = require('node:vm');

const pages = [
  { file: 'public/index.html', required: ['menu', 'features'] },
  { file: 'public/console.html', required: ['authForm', 'appView', 'page', 'modalRoot', 'registerApp', 'manageRules', 'createApiKey', 'security_rules', '/api/client/'] }
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
const backend = fs.readFileSync('server.js', 'utf8');
for (const required of ['security_rules', '/api/client/', 'clientKeyAuth']) if (!backend.includes(required)) throw new Error('Missing backend security feature: ' + required);
console.log('Landing page, developer console and backend security checks passed.');
