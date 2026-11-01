const fs = require('node:fs');
const path = require('node:path');
const label = process.argv[2] || 'qa-final-clean';
if (!/^[a-zA-Z0-9-]+$/.test(label)) throw Error('Invalid QA run label');
const base = path.resolve('artifacts/lab-04/e2e-results', label);
const result = JSON.parse(fs.readFileSync(path.join(base, 'results.json'), 'utf8'));
if (result.stats.expected !== 3 || result.stats.unexpected || result.stats.flaky || result.stats.skipped) throw Error('Copy screenshots only from a fully passing three-viewport audit');
let count = 0;
for (const directory of fs.readdirSync(base, { withFileTypes: true }).filter(item => item.isDirectory())) {
  for (const name of fs.readdirSync(path.join(base, directory.name))) {
    if (!/^(staff|requester|actions)-(mobile-375x812|tablet-768x1024|desktop-1440x900)-[a-z-]+\.png$/.test(name)) continue;
    const group = name.startsWith('staff-') ? 'staff-dashboard' : name.startsWith('requester-') ? 'requester-dashboard' : 'actions-taken';
    const destination = path.resolve('artifacts/lab-04/screenshots', group, name);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(base, directory.name, name), destination);
    count++;
  }
}
console.log(`Copied ${count} verified QA screenshots from ${label}`);
