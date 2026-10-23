import * as assert from 'node:assert/strict';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as vscode from 'vscode';
import { BinarySources } from '../binarySources';
import type { Api } from '../extension';

suite('Binary sources', () => {
  test('the running client protects sources reported by cjls and clears a removed root', async function () {
    if (!process.env.CJLS_BIN) this.skip();
    const api = await vscode.extensions.getExtension<Api>('ide4cj.cangjie')!.activate();
    const client = api.client();
    assert.ok(client);
    if (!client.initializeResult?.capabilities.experimental?.binarySourceRoots) this.skip();
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cjls-source-notification-'));
    const root = vscode.Uri.file(path.join(dir, 'lib sources'));
    const file = vscode.Uri.joinPath(root, 'lib.cj');
    const project = path.join(dir, 'cj-project.json');
    const config = vscode.workspace.getConfiguration('cjls');
    const previous = config.inspect<string[]>('linkedProjects')?.workspaceValue;
    await vscode.workspace.fs.createDirectory(root);
    await vscode.workspace.fs.writeFile(file, new TextEncoder().encode('package lib\n'));
    await fs.writeFile(project, JSON.stringify({ modules: [], binaries: [{ name: 'lib', paths: [], sources: root.fsPath }] }));
    const editor = await vscode.window.showTextDocument(file);
    async function canType(): Promise<boolean> {
      assert.equal(vscode.window.activeTextEditor?.document.uri.toString(), file.toString());
      const before = editor.document.getText();
      await vscode.commands.executeCommand('type', { text: 'x' });
      const changed = editor.document.getText() !== before;
      if (changed) await vscode.commands.executeCommand('undo');
      return changed;
    }
    async function untilReported(present: boolean): Promise<void> {
      while ((await api.binarySourceRoots()).includes(root.toString()) !== present) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    try {
      await config.update('linkedProjects', [project], vscode.ConfigurationTarget.Workspace);
      await untilReported(true);
      assert.equal(await canType(), false);
      await fs.writeFile(project, JSON.stringify({ modules: [], binaries: [] }));
      await client.sendNotification('workspace/didChangeWatchedFiles', {
        changes: [{ uri: vscode.Uri.file(project).toString(), type: 2 }],
      });
      await untilReported(false);
      assert.equal(await canType(), true);
    } finally {
      await config.update('linkedProjects', previous, vscode.ConfigurationTarget.Workspace);
      await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
  test('session readonly prevents typing and roots replacement restores editing', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cjls-readonly-'));
    const root = vscode.Uri.file(path.join(dir, 'std sources #1'));
    const file = vscode.Uri.joinPath(root, 'core.cj');
    const sibling = vscode.Uri.file(path.join(dir, 'std sources #1-other', 'main.cj'));
    const errors: string[] = [];
    const sources = new BinarySources((message) => errors.push(message));
    try {
      for (const uri of [file, sibling]) {
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(uri.fsPath)));
        await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode('package example\n'));
      }
      const editor = await vscode.window.showTextDocument(file);
      await sources.update({ roots: [root.toString()] });
      await vscode.commands.executeCommand('type', { text: 'x' });
      assert.equal(editor.document.getText(), 'package example\n');
      const other = await vscode.window.showTextDocument(sibling);
      await sources.apply();
      await vscode.commands.executeCommand('type', { text: 'x' });
      assert.ok(other.document.getText().includes('x'));
      await vscode.window.showTextDocument(file);
      await sources.apply();
      await sources.update({ roots: [] });
      await vscode.commands.executeCommand('type', { text: 'x' });
      assert.ok(editor.document.getText().includes('x'));
      assert.deepEqual(errors, []);
    } finally {
      await sources.update({ roots: [] });
      sources.dispose();
      await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
