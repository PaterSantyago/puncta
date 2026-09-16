import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
const result = await build({ entryPoints: ['demo.mjs'], bundle: true, write: false,
  format: 'iife', minify: true, legalComments: 'inline',
  define: { 'process.env.NODE_ENV': '"development"' } });
const shell = await readFile('shell.html', 'utf8');
await writeFile('prototype.html', shell.replace('/* BUNDLE */', () =>
  result.outputFiles[0].text.replaceAll('</script', '<\\/script')));
console.log('Open prototype.html — self-contained, no network or server needed.');
