#!/usr/bin/env node
'use strict';

/**
 * CORTEX — DAG Visualizer
 * Reads ai/task-graph.json and renders ASCII dependency graph.
 *
 * Usage:
 *   node scripts/dag.js visualize          # full ASCII DAG
 *   node scripts/dag.js next               # tasks ready to run now
 *   node scripts/dag.js visualize --graph=path/to/task-graph.json
 */

const fs   = require('fs');
const path = require('path');

const STATUS_ICON = {
  done:        '✓',
  in_progress: '⏳',
  pending:     '□',
  blocked:     '✗',
  skipped:     '~',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function findGraphFile() {
  const graphArg = process.argv.find(a => a.startsWith('--graph='));
  if (graphArg) {
    const p = graphArg.split('=')[1];
    return fs.existsSync(p) ? p : null;
  }
  const local = path.join(process.cwd(), 'ai', 'task-graph.json');
  return fs.existsSync(local) ? local : null;
}

function loadGraph() {
  const file = findGraphFile();
  if (!file) {
    console.error('✗  No task-graph.json found.');
    console.error('   Run /cortex-task-graph generate first,');
    console.error('   or pass --graph=path/to/task-graph.json');
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`✗  Failed to parse ${file}: ${e.message}`);
    process.exit(1);
  }
}

function pad(str, len) {
  const s = String(str);
  return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length);
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

const SEP = '━'.repeat(62);

// ─── VISUALIZE ───────────────────────────────────────────────────────────────

function visualize(graph) {
  const nodes   = graph.nodes || [];
  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  const total      = nodes.length;
  const doneCount  = nodes.filter(n => n.status === 'done').length;
  const barLen     = 24;
  const filled     = total > 0 ? Math.round((doneCount / total) * barLen) : 0;
  const bar        = '█'.repeat(filled) + '░'.repeat(barLen - filled);

  console.log(SEP);
  console.log(`TASK DEPENDENCY GRAPH — ${graph.feature || 'unknown'}`);
  console.log(`${total} nodes · [${bar}] ${doneCount}/${total} done`);
  console.log(SEP);

  // Build phase → node map
  const phases = {};
  nodes.forEach(n => {
    const p = (n.phase !== undefined ? n.phase : 0);
    if (!phases[p]) phases[p] = [];
    phases[p].push(n);
  });

  // Build parallel group lookup: nodeId → groupNodes[]
  const parallelMap = {};
  if (Array.isArray(graph.parallelGroups)) {
    graph.parallelGroups.forEach(g => {
      if (g.nodes && g.nodes.length > 1) {
        g.nodes.forEach(id => {
          parallelMap[id] = g.nodes;
        });
      }
    });
  }

  const sortedPhases = Object.keys(phases).map(Number).sort((a, b) => a - b);

  sortedPhases.forEach((phaseNum, idx) => {
    const phaseNodes = phases[phaseNum];

    // Partition: solo vs parallel
    const seenInGroup = new Set();
    const groups      = [];   // arrays of nodes that run in parallel
    const solos       = [];   // nodes that run alone

    phaseNodes.forEach(n => {
      if (seenInGroup.has(n.id)) return;
      const groupIds = parallelMap[n.id];
      if (groupIds && groupIds.length > 1) {
        // Collect all group members that are in this phase
        const groupMembers = groupIds
          .map(id => nodeMap[id])
          .filter(Boolean)
          .filter(m => phaseNodes.includes(m));
        if (groupMembers.length > 1) {
          groups.push(groupMembers);
          groupMembers.forEach(m => seenInGroup.add(m.id));
        } else {
          solos.push(n);
          seenInGroup.add(n.id);
        }
      } else {
        solos.push(n);
        seenInGroup.add(n.id);
      }
    });

    // Phase separator
    if (idx > 0) console.log('  │');
    console.log(`\nPhase ${phaseNum}`);

    // Solo nodes
    solos.forEach(n => {
      const icon  = STATUS_ICON[n.status] || '?';
      const label = truncate(n.label || n.name || n.id, 42);
      console.log(`  ${icon}  [${pad(n.type, 9)}]  ${label}`);
    });

    // Parallel groups
    groups.forEach(group => {
      const allDone = group.every(n => n.status === 'done');
      console.log('  │');
      if (allDone && group.length >= 3) {
        // Collapse large all-done groups
        console.log(`  ├── [PARALLEL — ${group.length} nodes]  ✓ ALL DONE`);
        console.log('  │   └── (add --expand to see details)');
      } else {
        console.log('  ├── [PARALLEL]');
        group.forEach((n, i) => {
          const icon   = STATUS_ICON[n.status] || '?';
          const prefix = i < group.length - 1 ? '  │   ├──' : '  │   └──';
          const label  = truncate(n.label || n.name || n.id, 36);
          console.log(`${prefix}  ${icon}  [${pad(n.type, 9)}]  ${label}`);
        });
      }
    });
  });

  console.log('');
  console.log(SEP);
  console.log('Legend: ✓ done  ⏳ active  □ pending  ✗ blocked  ~ skipped');
  console.log(SEP);
  console.log('');

  // Always show NEXT after visualize
  _printNext(graph, nodeMap);
}

// ─── NEXT ────────────────────────────────────────────────────────────────────

function _printNext(graph, nodeMap) {
  const nodes = graph.nodes || [];

  const ready = nodes.filter(n => {
    if (n.status !== 'pending') return false;
    const deps = n.dependsOn || [];
    return deps.every(dep => nodeMap[dep] && nodeMap[dep].status === 'done');
  });

  console.log(SEP);
  console.log('READY TO RUN NOW');
  console.log(SEP);
  console.log('');

  if (ready.length === 0) {
    const blocked = nodes.filter(n => n.status === 'blocked').length;
    const pending = nodes.filter(n => n.status === 'pending').length;
    if (pending === 0 && blocked === 0) {
      const inProgress = nodes.filter(n => n.status === 'in_progress').length;
      if (inProgress === 0) {
        console.log('  ✓  All tasks complete!');
      } else {
        console.log(`  ⏳  ${inProgress} task(s) in progress — nothing new ready yet`);
      }
    } else if (pending > 0) {
      console.log(`  ⏸   ${pending} task(s) waiting on dependencies`);
    } else {
      console.log(`  ✗  ${blocked} task(s) blocked — resolve blockers first`);
    }
  } else {
    ready.forEach(n => {
      const label = truncate(n.label || n.name || n.id, 50);
      console.log(`  □  ${n.id}`);
      console.log(`     ${label}`);
      if (n.skill) console.log(`     → ${n.skill}`);
      console.log('');
    });

    if (ready.length > 1) {
      const ids = ready.map(n => n.id).join('  ·  ');
      console.log(`  (${ready.length} tasks — safe to run in parallel)`);
      console.log(`   ${ids}`);
    }
  }

  console.log('');
  console.log(SEP);
}

function next(graph) {
  const nodeMap = {};
  (graph.nodes || []).forEach(n => { nodeMap[n.id] = n; });

  console.log(SEP);
  console.log(`READY TASKS — ${graph.feature || 'unknown'}`);
  console.log(SEP);
  console.log('');

  const nodes = graph.nodes || [];
  const ready = nodes.filter(n => {
    if (n.status !== 'pending') return false;
    return (n.dependsOn || []).every(dep => nodeMap[dep]?.status === 'done');
  });

  if (ready.length === 0) {
    const blocked    = nodes.filter(n => n.status === 'blocked').length;
    const pending    = nodes.filter(n => n.status === 'pending').length;
    const inProgress = nodes.filter(n => n.status === 'in_progress').length;
    if (pending === 0 && blocked === 0 && inProgress === 0) {
      console.log('  ✓  All tasks complete!');
    } else if (inProgress > 0) {
      console.log(`  ⏳  ${inProgress} task(s) in progress — nothing new unblocked yet`);
    } else if (blocked > 0) {
      console.log(`  ✗  ${blocked} task(s) blocked`);
      console.log('     Resolve blockers or run /cortex-task-graph status for detail.');
    } else {
      console.log(`  ⏸   ${pending} task(s) waiting — check dependencies`);
    }
  } else {
    ready.forEach(n => {
      const label = truncate(n.label || n.name || n.id, 50);
      console.log(`  □  ${n.id}`);
      console.log(`     ${label}`);
      if (n.skill)     console.log(`     → ${n.skill}`);
      if (n.skillArgs) console.log(`       args: ${n.skillArgs}`);
      console.log('');
    });

    if (ready.length > 1) {
      console.log(`  (${ready.length} tasks — no shared dependencies · safe to parallelize)`);
    }
  }

  console.log('');
  console.log(SEP);
}

// ─── Entry ───────────────────────────────────────────────────────────────────

const command = process.argv[2];

if (command === 'visualize') {
  visualize(loadGraph());
} else if (command === 'next') {
  next(loadGraph());
} else {
  console.log('CORTEX — DAG Visualizer');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/dag.js visualize            render full ASCII dependency graph');
  console.log('  node scripts/dag.js next                 show tasks ready to run right now');
  console.log('');
  console.log('Options:');
  console.log('  --graph=<path>   override default ai/task-graph.json lookup');
}
