import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'dist-cdn/**', 'coverage/**', 'node_modules/**', 'test/baseline/**'] },
  ...tseslint.configs.recommended,
);
