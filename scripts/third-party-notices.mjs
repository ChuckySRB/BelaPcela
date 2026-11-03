import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
const sections = ['БелаПчела — third-party notices', '',
  'Generated from the locked production dependency tree, including type declarations.',
  'Each dependency retains its own license. The application license follows below.',
  'Regenerate after dependency updates with npm run licenses.', '',
  'ELK source: https://github.com/kieler/elkjs',
  'Eclipse Layout Kernel source: https://github.com/eclipse/elk', '',
  'Application license', (await readFile(path.join(root, 'LICENSE'), 'utf8')).replace(/\r\n/g, '\n').trim(), ''];

for (const [location, entry] of Object.entries(lock.packages).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
  if (!location || entry.dev) continue;
  const directory = path.join(root, location);
  const pkg = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));
  if (pkg.version !== entry.version) throw new Error(`Run npm ci: ${location} differs from package-lock.json.`);
  const files = (await readdir(directory)).filter(file => /^(licen[cs]e|copying|notice)([.\-]|$)/i.test(file)).sort();
  if (!files.length) throw new Error(`No license file found for ${pkg.name}. Review its notices before building.`);
  sections.push('='.repeat(72), `${pkg.name} ${pkg.version}`, `License: ${pkg.license || 'See license text'}`);
  const repository = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  if (repository) sections.push(`Source: ${repository}`);
  for (const file of files) {
    if (!(await stat(path.join(directory, file))).isFile()) continue;
    sections.push('', `--- ${file} ---`, (await readFile(path.join(directory, file), 'utf8')).replace(/\r\n/g, '\n').trim());
  }
  sections.push('');
}

const output = `${sections.join('\n').trim()}\n`;
const target = path.join(root, 'public/licenses/THIRD_PARTY_NOTICES.txt');
if (process.argv.includes('--check')) {
  const current = await readFile(target, 'utf8').catch(() => '');
  if (current.replace(/\r\n/g, '\n') !== output) throw new Error('Third-party notices are outdated. Run npm run licenses and commit the result.');
} else {
  await writeFile(target, output, 'utf8');
  process.stdout.write('Updated public/licenses/THIRD_PARTY_NOTICES.txt\n');
}
