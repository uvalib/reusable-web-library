import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseScssVars } from '../scripts/sync-tokens.mjs';

test('parseScssVars keeps scalar vars and skips comments and maps', () => {
  const text = '// c\n$uva-brand-blue: #232D4B;\n$x-map: (a: 1);\n/// d\n$uva-teal-A: #1DA1A8;';
  assert.deepEqual(parseScssVars(text), [
    ['uva-brand-blue', '#232D4B'],
    ['uva-teal-A', '#1DA1A8'],
  ]);
});

test('parseScssVars skips values that reference another variable', () => {
  assert.deepEqual(parseScssVars('$a: #fff;\n$b: $a;\n$c: $a * 2;'), [['a', '#fff']]);
});

test('parseScssVars ignores trailing comments and @ rules', () => {
  assert.deepEqual(parseScssVars('@use "x";\n$a: #e6f2f7; //new color\n'), [['a', '#e6f2f7']]);
});

test('parseScssVars: the last definition of a name wins, emitted once', () => {
  assert.deepEqual(parseScssVars('$a: 1px;\n$b: 2px;\n$a: 3px;'), [
    ['a', '3px'],
    ['b', '2px'],
  ]);
});
