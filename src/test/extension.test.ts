// The extension in a real VS Code, opened on test/fixture. The server's cases need a cjls binary in
// CJLS_BIN, which .vscode-test.mjs writes into the user settings as `cjls.server.path` before VS
// Code starts; without it they are skipped.

import * as assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Api } from '../extension';
import { MacroExpansion, SCHEME, SHOW_MACRO_EXPANSION, expandsMacros } from '../expandMacro';

const fixture = vscode.workspace.workspaceFolders![0].uri;
const main = vscode.Uri.joinPath(fixture, 'src', 'main.cj');
/** `@Derive[Equatable]` on line 4. */
const derive = vscode.Uri.joinPath(fixture, 'src', 'derive.cj');
const onDerive = new vscode.Position(4, 1);

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

/** Whether the cjls of CJLS_BIN finds an SDK, whose std `@Derive` comes from, as the server does. */
function findsStd(): boolean {
  const project = JSON.parse(
    execFileSync(process.env.CJLS_BIN!, ['project', '--dir', fixture.fsPath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }),
  );
  return (project.binaries ?? []).some(
    (b: { name: string; paths?: string[] }) => b.name === 'std' && (b.paths ?? []).length > 0,
  );
}

/** Opens `uri` with the cursor at `at`. */
async function showAt(uri: vscode.Uri, at: vscode.Position): Promise<vscode.TextEditor> {
  const editor = await vscode.window.showTextDocument(uri);
  editor.selection = new vscode.Selection(at, at);
  return editor;
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

  test('a .cj.macrocall file is Cangjie, as cjc --debug-macro and cjls write them', async () => {
    // arrange
    const file = vscode.Uri.joinPath(fixture, 'scratch.cj.macrocall');
    await vscode.workspace.fs.writeFile(file, new TextEncoder().encode('package fixture\n'));

    try {
      // act
      const doc = await vscode.workspace.openTextDocument(file);

      // assert
      assert.equal(doc.languageId, 'cangjie');
    } finally {
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
      await vscode.workspace.fs.delete(file);
    }
  });

  test('Cangjie: Expand Macro is in the palette of a Cangjie editor whose server expands macros', () => {
    // act
    const contributes = vscode.extensions.getExtension('ide4cj.cangjie')!.packageJSON.contributes;

    // assert: not `cjls.expandMacro`, which is the server's command, registered from its capabilities
    const command = contributes.commands.find((c: { command: string }) => c.command === SHOW_MACRO_EXPANSION);
    assert.deepEqual(command, { command: SHOW_MACRO_EXPANSION, title: 'Expand Macro', category: 'Cangjie' });
    assert.ok(!contributes.commands.some((c: { command: string }) => c.command === 'cjls.expandMacro'));
    assert.deepEqual(contributes.menus.commandPalette, [
      { command: SHOW_MACRO_EXPANSION, when: 'editorLangId == cangjie && cjls.expandsMacros' },
    ]);
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

  test('Expand Macro off a macro call shows nothing', async function () {
    // arrange
    if (!expandsMacros((await extension()).client())) {
      this.skip();
    }
    await showAt(main, new vscode.Position(0, 0));

    // act
    const shown = await vscode.commands.executeCommand<vscode.TextDocument | undefined>(SHOW_MACRO_EXPANSION);

    // assert
    assert.equal(shown, undefined);
  });

  test('Expand Macro on @Derive[Equatable] shows its extend beside, read-only and Cangjie', async function () {
    // arrange: std's `@Derive` needs an SDK the server finds
    const client = (await extension()).client();
    if (!expandsMacros(client) || !findsStd()) {
      this.skip();
    }
    const editor = await showAt(derive, onDerive);
    // the project and std are loaded after the document opens: null until then. By its name: this
    // test's vscode-languageclient is not the bundle's, whose `RequestType` it would not take
    await until(async () =>
      (await client!.sendRequest<MacroExpansion | null>('cjls/expandMacro', {
        textDocument: { uri: client!.code2ProtocolConverter.asUri(derive) },
        position: onDerive,
      })) ?? undefined,
    );

    try {
      // act
      const shown = await vscode.commands.executeCommand<vscode.TextDocument | undefined>(SHOW_MACRO_EXPANSION);

      // assert
      assert.ok(shown, 'an expansion is shown');
      assert.equal(shown.uri.scheme, SCHEME);
      assert.equal(shown.languageId, 'cangjie');
      assert.match(shown.getText(), /\bextend\b/);
      assert.equal(vscode.window.activeTextEditor, editor, 'the focus stays in the source');
      assert.ok(
        vscode.window.visibleTextEditors.some((e) => e.document === shown && e.viewColumn !== editor.viewColumn),
        'the expansion is beside the source',
      );
    } finally {
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    }
  });

  test("the server's code action Expand macro opens its expanded file, Cangjie", async function () {
    // arrange
    const client = (await extension()).client();
    if (!expandsMacros(client) || !findsStd()) {
      this.skip();
    }
    await showAt(derive, onDerive);
    const expanded = vscode.Uri.joinPath(fixture, '.cache', 'cjls', 'expanded', 'src', 'derive.cj.macrocall');
    const action = await until(async () => {
      const actions = await vscode.commands.executeCommand<(vscode.CodeAction | vscode.Command)[]>(
        'vscode.executeCodeActionProvider',
        derive,
        new vscode.Range(onDerive, onDerive),
      );
      return actions?.find((a) => a.title.startsWith('Expand macro'));
    });
    const command =
      typeof action.command === 'string' ? (action as vscode.Command) : (action as vscode.CodeAction).command!;

    try {
      // act: vscode-languageclient runs it as `workspace/executeCommand`, and shows the file the
      // server writes when it asks by `window/showDocument`
      await vscode.commands.executeCommand(command.command, ...(command.arguments ?? []));
      const editor = await until(async () => {
        const active = vscode.window.activeTextEditor;
        const opened = active && path.resolve(active.document.uri.fsPath) === path.resolve(expanded.fsPath);
        return opened ? active : undefined;
      });

      // assert
      assert.equal(command.command, 'cjls.expandMacro');
      assert.equal(editor.document.languageId, 'cangjie');
      assert.match(editor.document.getText(), /\bextend\b/);
    } finally {
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
      await vscode.workspace.fs.delete(vscode.Uri.joinPath(fixture, '.cache', 'cjls', 'expanded'), { recursive: true });
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
