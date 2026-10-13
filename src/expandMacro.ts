// Expand macro (cjls's D103): `cjls/expandMacro` at the cursor, its answer shown in a read-only
// virtual document beside the editor, as rust-analyzer's client shows `rust-analyzer/expandMacro`.
// The server's own code action "Expand macro" needs nothing here: its command `cjls.expandMacro`
// is registered by vscode-languageclient from `executeCommandProvider`, and the file it writes is
// opened by `window/showDocument`.

import * as vscode from 'vscode';
import { LanguageClient, RequestType, TextDocumentPositionParams } from 'vscode-languageclient/node';

/** The command of this extension; `cjls.expandMacro` is the server's, run by `workspace/executeCommand`. */
export const SHOW_MACRO_EXPANSION = 'cjls.showMacroExpansion';

/** The context key the command's `when` reads: the running server answers `cjls/expandMacro`. */
export const EXPANDS_MACROS = 'cjls.expandsMacros';

/** The scheme of the documents expansions are shown in: read-only, never sent to the server. */
export const SCHEME = 'cjls-expand-macro';

/** What `cjls/expandMacro` answers (cjls's docs/lsp-extensions.md). */
export interface MacroExpansion {
  /** The macro as the call writes it: `@Derive`, `@m.M`. */
  name: string;
  /** The expansion, formatted. */
  expansion: string;
  /** `workspace`: the macro server's output; `cjls`: cjls's own for one of std, signatures only. */
  kind: string;
}

export const expandMacroRequest = new RequestType<TextDocumentPositionParams, MacroExpansion | null, void>(
  'cjls/expandMacro',
);

/** Whether `client`'s server answers `cjls/expandMacro`. */
export function expandsMacros(client: LanguageClient | undefined): boolean {
  return client?.initializeResult?.capabilities.experimental?.expandMacro === true;
}

/**
 * The expansions shown, by the URI of their document: one per macro, so a new expansion of the
 * same macro replaces the text of its tab.
 */
export class ExpansionDocuments implements vscode.TextDocumentContentProvider {
  private readonly texts = new Map<string, string>();
  private readonly changed = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this.changed.event;

  /** Keeps `expansion` as the text of its document, and returns that document's URI. */
  put(expansion: MacroExpansion): vscode.Uri {
    // `.cj`: the document is Cangjie by its name, as any file is
    const uri = vscode.Uri.from({ scheme: SCHEME, path: `/${expansion.name} expansion.cj` });
    const key = uri.toString();
    const known = this.texts.has(key);
    this.texts.set(key, expansion.expansion);
    if (known) {
      this.changed.fire(uri);
    }
    return uri;
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.texts.get(uri.toString()) ?? '';
  }

  dispose(): void {
    this.changed.dispose();
  }
}

/**
 * Asks `client` what the macro call at the cursor of `editor` expands to, and shows it beside the
 * editor; returns that document, or undefined when there is nothing to show (and says why).
 */
export async function showMacroExpansion(
  client: LanguageClient | undefined,
  documents: ExpansionDocuments,
  editor: vscode.TextEditor | undefined,
): Promise<vscode.TextDocument | undefined> {
  if (!editor || editor.document.languageId !== 'cangjie') {
    return undefined;
  }
  if (!client || !expandsMacros(client)) {
    void vscode.window.showInformationMessage('cjls: the running server does not expand macros.');
    return undefined;
  }
  const params: TextDocumentPositionParams = {
    textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(editor.document),
    position: client.code2ProtocolConverter.asPosition(editor.selection.active),
  };
  const expansion = await client.sendRequest(expandMacroRequest, params);
  if (!expansion) {
    void vscode.window.showInformationMessage('cjls: no macro call with an expansion at the cursor.');
    return undefined;
  }
  const doc = await vscode.workspace.openTextDocument(documents.put(expansion));
  await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true });
  return doc;
}
