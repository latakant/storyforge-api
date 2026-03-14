#!/usr/bin/env node
'use strict';

/**
 * CORTEX — Lifecycle Logger
 * Logs skill actions to ai/logs/cortex-execution.jsonl
 * Usage: node scripts/lifecycle.js log --action=X --module=Y --detail="Z"
 */

const fs   = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'ai', 'logs', 'cortex-execution.jsonl');

function parseArgs(argv) {
  const args = {};
  argv.slice(2).forEach(arg => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    args[key] = rest.join('=');
  });
  return args;
}

function log(args) {
  const entry = {
    timestamp: new Date().toISOString(),
    action:    args.action   || 'UNKNOWN',
    module:    args.module   || 'cortex',
    detail:    args.detail   || '',
    verdict:   args.verdict  || 'PASS',
    session:   args.session  || `session-${new Date().toISOString().slice(0, 10)}`,
  };

  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
  console.log(`[CORTEX LOG] ${entry.action} · ${entry.module} · ${entry.verdict}`);
}

const command = process.argv[2];
const args    = parseArgs(process.argv);

if (command === 'log') {
  log(args);
} else {
  console.log('Usage: node scripts/lifecycle.js log --action=X --module=Y --detail="Z"');
}
