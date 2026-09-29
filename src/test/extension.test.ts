// The extension in a real VS Code, opened on test/fixture. The server's cases need a cjls binary in
// CJLS_BIN, which .vscode-test.mjs writes into the user settings as `cjls.server.path` before VS
// Code starts; without it they are skipped.

import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Api } from '../extension';

const fixture = vscode.workspace.workspaceFolders![0].uri;
const main = vscode.Uri.joinPath(fixture, 'src', 'main.cj');

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

  test('comments toggle with //', async () => {
    // arrange
    const doc = await vscode.workspace.openTextDocument({ language: 'cangjie', content: 'let a = 1\n' });
    const editor = await vscode.window.showTextDocument(doc);

    // act
    await vscode.commands.executeCommand('editor.action.commentLine');

    // assert
    assert.equal(editor.document.lineAt(0).text, '// let a = 1');
    await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
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
