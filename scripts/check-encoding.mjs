#!/usr/bin/env node
/**
 * check-encoding.mjs — Verify no UTF-8 mojibake in source files.
 * Fails if known double-encoding patterns are found.
 * Excludes: node_modules, dist, .git, binary files.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const TEXT_EXTS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.sql',
  '.html',
  '.css',
]);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage', 'cdk.out', '.build']);

// Known mojibake byte patterns (double-encoded UTF-8)
const PATTERNS = [
  { bytes: Buffer.from('c383c2b1', 'hex'), desc: 'double-encoded ñ' },
  { bytes: Buffer.from('c383c2b3', 'hex'), desc: 'double-encoded ó' },
  { bytes: Buffer.from('c383c2a1', 'hex'), desc: 'double-encoded á' },
  { bytes: Buffer.from('c383c2a9', 'hex'), desc: 'double-encoded é' },
  { bytes: Buffer.from('c383c2ad', 'hex'), desc: 'double-encoded í' },
  { bytes: Buffer.from('c3a2c280c293', 'hex'), desc: 'double-encoded em-dash (—)' },
  { bytes: Buffer.from('c3a2c280c2', 'hex'), desc: 'double-encoded smart quote start' },
];

let errors = 0;

function check(filePath) {
  const buf = readFileSync(filePath);
  for (const { bytes, desc } of PATTERNS) {
    const idx = buf.indexOf(bytes);
    if (idx !== -1) {
      const rel = filePath.replace(root + '\\', '').replace(root + '/', '');
      console.error(`ERROR: ${rel} contains ${desc} at byte ${idx}`);
      errors++;
    }
  }
  // Also check for BOM
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    const rel = filePath.replace(root + '\\', '').replace(root + '/', '');
    console.error(`ERROR: ${rel} has UTF-8 BOM`);
    errors++;
  }
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (TEXT_EXTS.has(extname(full))) check(full);
  }
}

walk(root);

if (errors > 0) {
  console.error(`\nFOUND ${errors} encoding error(s). Fix with proper UTF-8 encoding.`);
  process.exit(1);
} else {
  console.log('check:encoding — all files clean (no mojibake, no BOM)');
}
