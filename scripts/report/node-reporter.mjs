// A node:test reporter that records every test's outcome in reports/node.json, for the
// test report (scripts/test-report.mjs). It prints nothing: `pnpm test:node` runs it beside
// the spec reporter.
import { mkdirSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';

export default async function* jsonReporter(source) {
  const tests = [];
  for await (const { type, data } of source) {
    if (type !== 'test:pass' && type !== 'test:fail') continue;
    if (data.details?.type === 'suite' || !data.file) continue;
    tests.push({
      file: relative(process.cwd(), data.file),
      name: data.name,
      status: data.skip || data.todo ? 'skipped' : type === 'test:pass' ? 'passed' : 'failed',
      ms: Math.round(data.details?.duration_ms ?? 0),
    });
  }
  mkdirSync('reports', { recursive: true });
  writeFileSync('reports/node.json', JSON.stringify({ runner: 'node:test', tests }, null, 1));
}
