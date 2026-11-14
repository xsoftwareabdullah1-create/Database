'use strict';
const fs = require('node:fs');
const vm = require('node:vm');

const pages = [
  { file: 'public/index.html', required: ['menu', 'features'] },
  { file: 'public/console.html', required: ['authForm', 'appView', 'page', 'modalRoot', 'registerApp', 'createApiKey'] }
];

for (const page of pages) {
  const html = fs.readFileSync(page.file, 'utf8');
  const scripts = [...html.matchAll(/<script>([\\s\\S]*?)<\\/script>/gi)];
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
console.log('Landing page and developer console JavaScript syntax and UI checks passed.');
