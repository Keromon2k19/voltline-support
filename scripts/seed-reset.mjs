#!/usr/bin/env node
/**
 * KAN-53 · Resets the seed data.
 *
 * Runs scripts/apex/seed-reset.apex with `sf apex run`. That script deletes the
 * seeded orders, accounts and contacts, finding them by the @example.com email
 * domain, so run this before loading the seed again.
 *
 * Usage:
 *   node scripts/seed-reset.mjs                       # default org
 *   node scripts/seed-reset.mjs --target-org <alias>  # another org
 *
 * Needs the Salesforce CLI (sf). Any extra arguments go straight to `sf apex run`.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APEX_FILE = path.join(ROOT, 'scripts', 'apex', 'seed-reset.apex');

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

function main() {
  console.log('Resetting the seed data...');

  // The Apex file has no data to fill in, so it runs as it is.
  const result = runSf(['apex', 'run', '--file', APEX_FILE, '--json', ...process.argv.slice(2)]);

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
    console.error(`Reset failed, nothing was deleted: ${run.exceptionMessage}`);
    if (run.exceptionStackTrace) {
      console.error(run.exceptionStackTrace);
    }
  } else {
    console.error(output.message ?? JSON.stringify(output, null, 2));
  }
  process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error.message ?? error);
  process.exitCode = 1;
}
