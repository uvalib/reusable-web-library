import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dist-cdn/**',
      'dist-site/**',
      'coverage/**',
      'node_modules/**',
      'test/baseline/**',
      // Agent worktrees and local Claude Code files: other branches' checkouts.
      '.claude/**',
    ],
  },
  ...tseslint.configs.recommended,
);
