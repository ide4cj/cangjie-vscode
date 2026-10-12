// The extension in a real VS Code, opened on test/fixture. The server's cases need a cjls binary in
// CJLS_BIN, which .vscode-test.mjs writes into the user settings as `cjls.server.path` before VS
// Code starts; without it they are skipped.

import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Api } from '../extension';

const fixture = vscode.workspace.workspaceFolders![0].uri;
const main = vscode.Uri.joinPath(fixture, 'src', 'main.cj');

/** Waits for `holds` to hold, however long: a hang is CI's to end (.vscode-test.mjs). */
async function until<T>(holds: () => Promise<T | undefined>): Promise<T> {
  for (;;) {
    const value = await holds();
    if (value !== undefined) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function extension(): Promise<Api> {
  const ext = vscode.extensions.getExtension<Api>('ide4cj.cangjie');
  assert.ok(ext, 'the extension is installed');
  return ext.activate();
}

suite('Cangjie', () => {
  test('a .cj file is Cangjie', async () => {
    // act
    const doc = await vscode.workspace.openTextDocument(main);

    // assert
    assert.equal(doc.languageId, 'cangjie');
  });
});

suite('without cjls', function () {
  suiteSetup(function () {
    if (process.env.CJLS_BIN) {
      this.skip();
    }
  });

  test('the extension activates though no server can be found', async () => {
    // act: the notification saying so is not waited for
    const api = await extension();

    // assert: undefined without a server; a cjls on PATH, when there is one, may still start
    assert.ok(api);
  });
});

suite('cjls', function () {
  suiteSetup(function () {
    if (!process.env.CJLS_BIN) {
      this.skip();
    }
  });

  test('cjls starts from cjls.server.path and says who it is', async () => {
    // act
    const client = (await extension()).client();

    // assert
    assert.ok(client, 'the client is running');
    assert.equal(client.initializeResult?.serverInfo?.name, 'cjls');
    assert.equal(
      path.resolve(vscode.workspace.getConfiguration('cjls').get<string>('server.path')!),
      path.resolve(process.env.CJLS_BIN!),
    );
  });

  test('cjls answers the symbols of a file', async () => {
    // arrange
    await extension();
    await vscode.window.showTextDocument(main);

    // act
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
      'vscode.executeDocumentSymbolProvider',
      main,
    );

    // assert
    assert.ok(symbols?.some((s) => s.name === 'main'), JSON.stringify(symbols));
  });

  test('cjls answers the semantic tokens of a file', async () => {
    // arrange
    await extension();
    await vscode.window.showTextDocument(main);

    // act
    const tokens = await vscode.commands.executeCommand<vscode.SemanticTokens>(
      'vscode.provideDocumentSemanticTokens',
      main,
    );

    // assert
    assert.ok(tokens && tokens.data.length > 0, 'some tokens');
  });

  test('cjls answers the folding ranges of a file', async () => {
    // arrange: `main` spans lines 2 to 5
    await extension();
    await vscode.window.showTextDocument(main);

    // act
    const ranges = await vscode.commands.executeCommand<vscode.FoldingRange[]>(
      'vscode.executeFoldingRangeProvider',
      main,
    );

    // assert
    assert.ok(ranges?.some((r) => r.start === 2 && r.end === 5), JSON.stringify(ranges));
  });

  test('a setting of the section cjls reaches cjls: the projects of cjls.linkedProjects are loaded', async () => {
    // arrange: a directory outside the workspace, loaded only when linked
    const linked = vscode.Uri.joinPath(fixture, '..', 'linked').fsPath;
    const config = vscode.workspace.getConfiguration('cjls');
    await config.update('linkedProjects', [linked], vscode.ConfigurationTarget.Global);
    const api = await extension();

    try {
      // act: started again, cjls has it from `initializationOptions` (and, since it reads its
      // settings, from `workspace/configuration` as well)
      await api.restart();
      const symbols = await until(async () => {
        const found = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
          'vscode.executeWorkspaceSymbolProvider',
          'findLinked',
        );
        return found?.some((s) => s.name === 'findLinked') ? found : undefined;
      });

      // assert
      const found = symbols.find((s) => s.name === 'findLinked')!;
      assert.equal(path.resolve(found.location.uri.fsPath), path.resolve(linked, 'linked.cj'));
    } finally {
      await config.update('linkedProjects', undefined, vscode.ConfigurationTarget.Global);
    }
  });

  test('a restart starts a new server', async () => {
    // arrange
    const api = await extension();
    const before = api.client();

    // act
    await api.restart();

    // assert
    assert.ok(api.client(), 'a client after the restart');
    assert.notEqual(api.client(), before);
  });
});
