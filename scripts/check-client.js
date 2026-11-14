'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('public/index.html', 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
if (!scripts.length) throw new Error('No client application script found');
for (const [index, match] of scripts.entries()) new vm.Script(match[1], { filename: 'public/index.html:inline-script-' + index });
for (const required of ['authForm','appView','page','modalRoot']) {
  if (!html.includes('id="' + required + '"')) throw new Error('Missing required UI element: ' + required);
}
console.log('Client JavaScript syntax and core UI checks passed.');
