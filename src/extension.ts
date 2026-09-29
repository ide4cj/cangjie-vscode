// Cangjie in VS Code: a thin client of cjls (cjls's D15, D32). The server answers what LSP can;
// this starts it, restarts it when its settings change, and gives it an output channel.

import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node';
import { findServer } from './server';

/** What the extension returns from `activate`, for its tests. */
export interface Api {
  /** The running client, or undefined when no server could be started. */
  client(): LanguageClient | undefined;
  /** Stops the server if it runs, and starts it again with the current settings. */
  restart(): Promise<void>;
}

let client: LanguageClient | undefined;
let output: vscode.LogOutputChannel | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<Api> {
  output = vscode.window.createOutputChannel('cjls', { log: true });
  context.subscriptions.push(
    output,
    vscode.commands.registerCommand('cjls.restartServer', restart),
    vscode.commands.registerCommand('cjls.showOutput', () => output?.show()),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('cjls.server')) {
        void restart();
      }
    }),
  );

  async function restart(): Promise<void> {
    await stop();
    await start(context);
  }

  await start(context);
  return { client: () => client, restart };
}

export async function deactivate(): Promise<void> {
  await stop();
}

async function start(context: vscode.ExtensionContext): Promise<void> {
  const server = findServer(context);
  if (!server) {
    const open = 'Open settings';
    const choice = await vscode.window.showErrorMessage(
      'cjls: no language server found. Set `cjls.server.path`, or put `cjls` on PATH.',
      open,
    );
    if (choice === open) {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'cjls.server.path');
    }
    return;
  }
  output?.info(`starting ${server.path} (${server.from})`);
  const extraEnv = vscode.workspace.getConfiguration('cjls').get<Record<string, string>>('server.extraEnv') ?? {};
  const serverOptions: ServerOptions = {
    command: server.path,
    options: { env: { ...process.env, ...extraEnv } },
  };
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'cangjie' },
      { scheme: 'untitled', language: 'cangjie' },
    ],
    outputChannel: output,
  };
  const started = new LanguageClient('cjls', 'cjls', serverOptions, clientOptions);
  try {
    await started.start();
    client = started;
  } catch (e) {
    output?.error(`cjls did not start: ${e}`);
    void vscode.window.showErrorMessage(`cjls did not start: ${e}`);
  }
}

async function stop(): Promise<void> {
  const running = client;
  client = undefined;
  if (running) {
    await running.stop();
  }
}
