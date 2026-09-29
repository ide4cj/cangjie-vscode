// Which cjls binary to run: `cjls.server.path`, else the one the VSIX ships in server/ (the pinned
// release in a stable build, the nightly in a pre-release, cjls's D32), else `cjls` on PATH.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

const EXE = process.platform === 'win32' ? 'cjls.exe' : 'cjls';

export type Found = { path: string; from: 'setting' | 'bundled' | 'PATH' };

export function findServer(context: vscode.ExtensionContext): Found | undefined {
  const configured = vscode.workspace.getConfiguration('cjls').get<string | null>('server.path');
  if (configured) {
    return { path: expandHome(configured), from: 'setting' };
  }
  const bundled = context.asAbsolutePath(path.join('server', EXE));
  if (isFile(bundled)) {
    return { path: bundled, from: 'bundled' };
  }
  const onPath = which(EXE);
  return onPath ? { path: onPath, from: 'PATH' } : undefined;
}

function expandHome(p: string): string {
  return p === '~' || p.startsWith('~/') ? path.join(process.env.HOME ?? '', p.slice(1)) : p;
}

function which(exe: string): string | undefined {
  return (process.env.PATH ?? '')
    .split(path.delimiter)
    .filter((dir) => dir !== '')
    .map((dir) => path.join(dir, exe))
    .find(isFile);
}

function isFile(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}
