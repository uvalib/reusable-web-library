// A web-test-runner reporter that records every browser test's outcome in
// reports/browser.json, for the test report (scripts/test-report.mjs). It prints nothing;
// web-test-runner.config.mjs runs it beside the default reporter.
import { mkdirSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';

/** Flattens a session's suites into [{ name: 'suite › test', … }]. */
function flatten(suite, prefix = []) {
  const path = suite.name ? [...prefix, suite.name] : prefix;
  return [
    ...(suite.tests ?? []).map((t) => ({
      name: [...path, t.name].join(' › '),
      status: t.skipped ? 'skipped' : t.passed ? 'passed' : 'failed',
      ms: Math.round(t.duration ?? 0),
    })),
    ...(suite.suites ?? []).flatMap((s) => flatten(s, path)),
  ];
}

export function jsonReporter() {
  return {
    onTestRunFinished({ sessions }) {
      const tests = [];
      for (const session of sessions) {
        const file = relative(process.cwd(), session.testFile);
        const group =
          session.group?.name && session.group.name !== 'default' ? session.group.name : '';
        const results = session.testResults ? flatten(session.testResults) : [];
        // A file that failed to load has no results, only errors: count it as one failure.
        if (!results.length && !session.passed)
          results.push({ name: '(the file failed to run)', status: 'failed', ms: 0 });
        for (const r of results) tests.push({ file, group, ...r });
      }
      mkdirSync('reports', { recursive: true });
      writeFileSync(
        'reports/browser.json',
        JSON.stringify({ runner: 'web-test-runner (Chromium)', tests }, null, 1),
      );
    },
  };
}
