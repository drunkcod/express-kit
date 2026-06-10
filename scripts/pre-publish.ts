import { readFileSync, writeFileSync } from 'node:fs';
import { default as expressAsync } from '../packages/express-async/package.json' with { type: 'json' };

const path = './package.json';
const pkg = JSON.parse(readFileSync(path, 'utf8'));

pkg.dependencies['@drunkcod/express-async'] = expressAsync.version;

writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
