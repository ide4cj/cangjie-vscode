// `npm test`: the extension in a VS Code of its own (VSCODE_VERSION: `stable` or `insiders`) opened
// on test/fixture. The server's cases run the binary in CJLS_BIN: it is the user's
// `cjls.server.path` in a fresh profile, before the extension activates; without it they are
// skipped. No timeout: a hang is CI's to end, not a race to lose on a slow runner.
import { defineConfig } from '@vscode/test-cli';
import * as fs from 'node:fs';
import * as path from 'node:path';

const userData = path.resolve('.vscode-test', 'user-data-tests');
fs.rmSync(userData, { recursive: true, force: true });
fs.mkdirSync(path.join(userData, 'User'), { recursive: true });
fs.writeFileSync(
  path.join(userData, 'User', 'settings.json'),
  JSON.stringify(process.env.CJLS_BIN ? { 'cjls.server.path': process.env.CJLS_BIN } : {}),
);

export default defineConfig({
  files: 'out/test/**/*.test.js',
  version: process.env.VSCODE_VERSION ?? 'stable',
  workspaceFolder: 'test/fixture',
  launchArgs: ['--disable-extensions', `--user-data-dir=${userData}`],
  mocha: { ui: 'tdd', timeout: 0 },
});
