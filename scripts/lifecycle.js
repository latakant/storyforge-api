#!/usr/bin/env node
'use strict';

/**
 * CORTEX — Lifecycle Logger
 * Logs skill actions to ai/logs/cortex-execution.jsonl
 *
 * Usage:
 *   node scripts/lifecycle.js log --action=X --module=Y --detail="Z"
 *   node scripts/lifecycle.js trace start          # generate ctx-XXXXX, save to ai/logs/.trace
 *   node scripts/lifecycle.js trace end            # clear active trace
 *   node scripts/lifecycle.js trace get            # print current trace ID
 */

const fs   = require('fs');
const path = require('path');

const LOG_DIR   = path.join(__dirname, '..', 'ai', 'logs');
const LOG_FILE  = path.join(LOG_DIR, 'cortex-execution.jsonl');
const TRACE_FILE = path.join(LOG_DIR, '.trace');

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function parseArgs(argv) {
  const args = {};
  argv.slice(2).forEach(arg => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    args[key] = rest.join('=');
  });
  return args;
}

function getCurrentTrace() {
  if (fs.existsSync(TRACE_FILE)) {
    return fs.readFileSync(TRACE_FILE, 'utf8').trim();
  }
  return null;
}

function generateTraceId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'ctx-';
  for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function log(args) {
  ensureDir();
  const traceId = args.trace || getCurrentTrace() || null;

  const entry = {
    timestamp: new Date().toISOString(),
    action:    args.action  || 'UNKNOWN',
    module:    args.module  || 'cortex',
    detail:    args.detail  || '',
    verdict:   args.verdict || 'PASS',
    session:   args.session || `session-${new Date().toISOString().slice(0, 10)}`,
    ...(traceId ? { traceId } : {}),
  };

  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
  const traceTag = traceId ? ` · ${traceId}` : '';
  console.log(`[CORTEX LOG] ${entry.action} · ${entry.module} · ${entry.verdict}${traceTag}`);
}

function trace(subcommand) {
  ensureDir();
  if (subcommand === 'start') {
    const id = generateTraceId();
    fs.writeFileSync(TRACE_FILE, id + '\n', 'utf8');
    console.log(`[CORTEX TRACE] started · ${id}`);
  } else if (subcommand === 'end') {
    if (fs.existsSync(TRACE_FILE)) {
      const id = getCurrentTrace();
      fs.unlinkSync(TRACE_FILE);
      console.log(`[CORTEX TRACE] ended · ${id}`);
    } else {
      console.log('[CORTEX TRACE] no active trace');
    }
  } else if (subcommand === 'get') {
    const id = getCurrentTrace();
    console.log(id ? `[CORTEX TRACE] active · ${id}` : '[CORTEX TRACE] none');
  } else {
    console.log('Usage: node scripts/lifecycle.js trace start|end|get');
  }
}

const command = process.argv[2];
const args    = parseArgs(process.argv);

if (command === 'log') {
  log(args);
} else if (command === 'trace') {
  trace(process.argv[3]);
} else {
  console.log('Usage:');
  console.log('  node scripts/lifecycle.js log --action=X --module=Y --detail="Z"');
  console.log('  node scripts/lifecycle.js trace start|end|get');
}
