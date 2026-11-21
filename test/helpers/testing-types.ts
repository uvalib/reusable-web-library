// Type check only (pnpm typecheck): a Playwright Page is a TestPage, so sites can pass theirs.
import type { Page } from 'playwright';
import type { TestPage } from '../../src/testing/index.js';

export const pageIsTestPage = (page: Page): TestPage => page;
