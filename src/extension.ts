// Cangjie in VS Code: a thin client of cjls (cjls's D15, D32). The server answers what LSP can;
// this starts it, restarts it when `cjls.server.*` changes, passes it the section `cjls` (cjls's
// D79), gives it an output channel, and shows what `cjls/expandMacro` answers (expandMacro.ts).

import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, State } from 'vscode-languageclient/node';
import {
  EXPANDS_MACROS,
  ExpansionDocuments,
  SCHEME,
  SHOW_MACRO_EXPANSION,
  expandsMacros,
  showMacroExpansion,
} from './expandMacro';
import { findServer } from './server';
import { BINARY_SOURCE_ROOTS, BinarySourceRootsParams, BinarySources } from './binarySources';

/** What the extension returns from `activate`, for its tests. */
export interface Api {
  /** The running client, or undefined when no server could be started. */
  client(): LanguageClient | undefined;
  /** Stops the server if it runs, and starts it again with the current settings. */
  restart(): Promise<void>;
  /** Reported binary source roots after pending editor protection has been applied. */
  binarySourceRoots(): Promise<readonly string[]>;
}

let client: LanguageClient | undefined;
let output: vscode.LogOutputChannel | undefined;
let binarySources: BinarySources | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<Api> {
  output = vscode.window.createOutputChannel('cjls', { log: true });
  const expansions = new ExpansionDocuments();
  binarySources = new BinarySources((message) => output?.error(message));
  context.subscriptions.push(
    output,
    expansions,
    binarySources,
    vscode.workspace.registerTextDocumentContentProvider(SCHEME, expansions),
    vscode.commands.registerCommand('cjls.restartServer', restart),
    vscode.commands.registerCommand('cjls.showOutput', () => output?.show()),
    vscode.commands.registerCommand(SHOW_MACRO_EXPANSION, () =>
      showMacroExpansion(client, expansions, vscode.window.activeTextEditor),
    ),
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
  return { client: () => client, restart, binarySourceRoots: async () => binarySources?.currentRoots() ?? [] };
}

export async function deactivate(): Promise<void> {
  await stop();
}

async function start(context: vscode.ExtensionContext): Promise<void> {
  const server = findServer(context);
  if (!server) {
    output?.error('no cjls binary: cjls.server.path is unset, none ships in this VSIX, and none is on PATH');
    // not awaited: activation would wait for the user to close the notification
    const open = 'Open settings';
    void vscode.window
      .showErrorMessage('cjls: no language server found. Set `cjls.server.path`, or put `cjls` on PATH.', open)
      .then((choice) => {
        if (choice === open) {
          void vscode.commands.executeCommand('workbench.action.openSettings', 'cjls.server.path');
        }
      });
    return;
  }
  output?.info(`starting ${server.path} (${server.from})`);
  const extraEnv = vscode.workspace.getConfiguration('cjls').get<Record<string, string>>('server.extraEnv') ?? {};
  const serverOptions: ServerOptions = {
    command: server.path,
    options: { env: { ...process.env, ...extraEnv } },
  };
  const clientOptions: LanguageClientOptions = {
    // `*.cj.macrocall` is Cangjie too (package.json), so the expanded files the server writes
    // (cjls's D103) are its documents; an expansion shown by `cjls.showMacroExpansion` is not
    documentSelector: [
      { scheme: 'file', language: 'cangjie' },
      { scheme: 'untitled', language: 'cangjie' },
    ],
    outputChannel: output,
    // the section as it is at the start; afterwards the server asks for it (`workspace/configuration`)
    // and registers for its changes, which vscode-languageclient answers and sends from the same
    // section. Keys it does not know, such as `server`, it leaves alone.
    initializationOptions: () => toJson(vscode.workspace.getConfiguration('cjls')),
  };
  const started = new LanguageClient('cjls', 'cjls', serverOptions, clientOptions);
  // Register before start: roots may arrive immediately after initialized.
  const rootsSubscription = started.onNotification(BINARY_SOURCE_ROOTS, (params: BinarySourceRootsParams) =>
    binarySources?.update(params),
  );
  context.subscriptions.push(rootsSubscription);
  started.onDidChangeState((event) => {
    if (event.newState !== State.Running) void binarySources?.update({ roots: [] });
  });
  try {
    await started.start();
    client = started;
    await vscode.commands.executeCommand('setContext', EXPANDS_MACROS, expandsMacros(started));
  } catch (e) {
    output?.error(`cjls did not start: ${e}`);
    void vscode.window.showErrorMessage(`cjls did not start: ${e}`);
  }
}

async function stop(): Promise<void> {
  const running = client;
  client = undefined;
  await vscode.commands.executeCommand('setContext', EXPANDS_MACROS, false);
  if (running) {
    await running.stop();
  }
  await binarySources?.update({ roots: [] });
}

/** A configuration as plain JSON: `WorkspaceConfiguration` carries its methods besides the values. */
function toJson(config: vscode.WorkspaceConfiguration): unknown {
  return JSON.parse(JSON.stringify(config));
}
