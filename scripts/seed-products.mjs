#!/usr/bin/env node
/**
 * KAN-51 · Seeds products and their Standard Price Book entries.
 *
 * Reads data/products.json, puts it into scripts/apex/seed-products.apex and
 * runs the result with `sf apex run`. The catalog lives only in products.json.
 *
 * Usage:
 *   node scripts/seed-products.mjs                       # default org
 *   node scripts/seed-products.mjs --target-org <alias>  # another org
 *
 * Needs the Salesforce CLI (sf). Any extra arguments go straight to `sf apex run`.
 */
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = path.join(ROOT, 'data', 'products.json');
const TEMPLATE = path.join(ROOT, 'scripts', 'apex', 'seed-products.apex');
const PLACEHOLDER = "'__CATALOG_JSON__'";

/** Turns text into an Apex single-quoted string literal. */
function toApexString(text) {
  const escaped = text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
  return `'${escaped}'`;
}

function quote(arg) {
  return /[\s"]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg;
}

/**
 * Runs sf through a shell. On Windows sf is a .cmd file, which Node can only
 * start that way, and cmd.exe isn't affected by PowerShell's execution policy.
 */
function runSf(args) {
  const command = ['sf', ...args].map(quote).join(' ');
  return spawnSync(command, {
    shell: true,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  });
}

/** Prints the System.debug lines from the Apex debug log. */
function printDebugLines(logs) {
  for (const line of (logs ?? '').split(/\r?\n/)) {
    const match = line.match(/\|USER_DEBUG\|\[\d+\]\|[A-Z]+\|(.*)$/);
    if (match) {
      console.log(match[1]);
    }
  }
}

async function main() {
  const catalog = JSON.parse(await readFile(CATALOG, 'utf8'));
  const template = await readFile(TEMPLATE, 'utf8');
  if (template.split(PLACEHOLDER).length !== 2) {
    throw new Error(`${path.relative(ROOT, TEMPLATE)} must contain ${PLACEHOLDER} exactly once.`);
  }

  // A function replacement, so "$" in the catalog isn't read as a replace pattern.
  const apex = template.replace(PLACEHOLDER, () => toApexString(JSON.stringify(catalog)));

  const dir = await mkdtemp(path.join(os.tmpdir(), 'voltline-seed-'));
  const file = path.join(dir, 'seed-products.apex');
  try {
    await writeFile(file, apex, 'utf8');
    console.log(`Seeding ${catalog.length} products...`);

    const result = runSf(['apex', 'run', '--file', file, '--json', ...process.argv.slice(2)]);

    let output;
    try {
      output = JSON.parse(result.stdout);
    } catch {
      console.error([result.stdout, result.stderr].filter(Boolean).join('\n').trim());
      console.error('\n`sf apex run` failed. Check that the Salesforce CLI is installed and a default org is set.');
      process.exitCode = 1;
      return;
    }

    const run = output.result ?? output.data ?? {};
    printDebugLines(run.logs);

    if (run.success === true) {
      console.log('Done.');
      return;
    }

    if (run.compiled === false) {
      console.error(`Apex didn't compile (line ${run.line}, column ${run.column}): ${run.compileProblem}`);
    } else if (run.exceptionMessage) {
      console.error(`Seed failed, nothing was saved: ${run.exceptionMessage}`);
      if (run.exceptionStackTrace) {
        console.error(run.exceptionStackTrace);
      }
    } else {
      console.error(output.message ?? JSON.stringify(output, null, 2));
    }
    process.exitCode = 1;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
