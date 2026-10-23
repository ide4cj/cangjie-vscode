import * as path from 'node:path';
import * as vscode from 'vscode';

export const BINARY_SOURCE_ROOTS = 'cjls/binarySourceRoots';
export interface BinarySourceRootsParams { roots: string[] }

/** Session protection of real files, without changing workspace settings or file permissions. */
export class BinarySources implements vscode.Disposable {
  private roots: vscode.Uri[] = [];
  private readonly protected = new Set<string>();
  private pending: Promise<void> = Promise.resolve();
  private readonly listener = vscode.window.onDidChangeActiveTextEditor(() => { void this.apply(); });

  constructor(private readonly log: (message: string) => void) {}

  update(params: BinarySourceRootsParams): Promise<void> {
    this.roots = params.roots.map((root) => vscode.Uri.parse(root)).filter((root) => root.scheme === 'file');
    return this.apply();
  }

  /** Commands act on the active editor only; reconcile again whenever another editor gets focus. */
  apply(): Promise<void> {
    this.pending = this.pending.then(async () => {
      const uri = vscode.window.activeTextEditor?.document.uri;
      if (!uri || uri.scheme !== 'file') return;
      const key = uri.toString();
      const covered = this.roots.some((root) => contains(root, uri));
      if (covered) {
        await vscode.commands.executeCommand('workbench.action.files.setActiveEditorReadonlyInSession');
        this.protected.add(key);
      } else if (this.protected.has(key)) {
        // Reset rather than force writable: configured and filesystem readonly still apply.
        await vscode.commands.executeCommand('workbench.action.files.resetActiveEditorReadonlyInSession');
        this.protected.delete(key);
      }
    }).catch((error) => this.log(`could not update binary source readonly: ${error}`));
    return this.pending;
  }

  dispose(): void {
    this.listener.dispose();
  }
}

function contains(root: vscode.Uri, file: vscode.Uri): boolean {
  if (root.authority !== file.authority) return false;
  const relative = path.relative(root.fsPath, file.fsPath);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}
