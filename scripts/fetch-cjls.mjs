// The cjls binary a platform VSIX ships, into server/:
//
//   node scripts/fetch-cjls.mjs <tag | pin> <vscode target>
//
// `pin` is the release in .cjls-version. The archive is the one cjls's release publishes for the
// target, checked against the release's SHA256SUMS.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// VS Code's targets, by the archives cjls publishes (its release.yml)
const TARGETS = {
  'darwin-arm64': { target: 'aarch64-apple-darwin', format: 'tar.gz', exe: 'cjls' },
  'linux-x64': { target: 'x86_64-unknown-linux-gnu', format: 'tar.gz', exe: 'cjls' },
  'win32-x64': { target: 'x86_64-pc-windows-gnu', format: 'zip', exe: 'cjls.exe' },
};

const [version, vscodeTarget] = process.argv.slice(2);
const platform = TARGETS[vscodeTarget];
if (!version || !platform) {
  console.error(`usage: fetch-cjls.mjs <tag | pin> <${Object.keys(TARGETS).join(' | ')}>`);
  process.exit(2);
}
const tag = version === 'pin' ? fs.readFileSync('.cjls-version', 'utf8').trim() : version;
if (!tag) {
  console.error('.cjls-version pins no release yet');
  process.exit(1);
}

const base = `https://github.com/ide4cj/cjls/releases/download/${tag}`;
const name = `cjls-${platform.target}`;
const archiveName = `${name}.${platform.format}`;

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url}: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

const archive = await download(`${base}/${archiveName}`);
const sums = (await download(`${base}/SHA256SUMS`)).toString('utf8');
const expected = sums
  .split('\n')
  .map((line) => line.trim().split(/\s+\*?/))
  .find(([, file]) => file === archiveName)?.[0];
const actual = createHash('sha256').update(archive).digest('hex');
if (!expected || expected.toLowerCase() !== actual) {
  throw new Error(`${archiveName} does not match the SHA256SUMS of ${tag}`);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cjls-'));
fs.writeFileSync(path.join(tmp, archiveName), archive);
// unzip for the zip: a GNU tar reads none
if (platform.format === 'zip') {
  execFileSync('unzip', ['-q', archiveName], { cwd: tmp });
} else {
  execFileSync('tar', ['-xzf', archiveName], { cwd: tmp });
}
fs.rmSync('server', { recursive: true, force: true });
fs.mkdirSync('server');
fs.copyFileSync(path.join(tmp, name, platform.exe), path.join('server', platform.exe));
fs.chmodSync(path.join('server', platform.exe), 0o755);
fs.writeFileSync(path.join('server', 'version'), `${tag}\n`);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`server/${platform.exe}: cjls ${tag} for ${vscodeTarget}`);
