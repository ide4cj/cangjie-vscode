# Cangjie for VS Code

[Cangjie](https://cangjie-lang.cn) in VS Code: the [cjls](https://github.com/ide4cj/cjls) language
server, shipped inside the extension; highlighting (the server's semantic tokens over a small
TextMate grammar); `//` comments, brackets and indentation.

> Another Cangjie extension (such as `IDE-Innovation-Lab.cangjie`) claims the same language: keep
> one of them enabled per workspace, or both start a server on every file.

## Install

From the Marketplace or [Open VSX](https://open-vsx.org): **Cangjie** by `ide4cj`. Or a VSIX from
[the releases](https://github.com/ide4cj/cangjie-vscode/releases): `code --install-extension cangjie-<platform>.vsix`.

| Channel | Version | cjls inside |
|---|---|---|
| release | even minor (`0.2.x`) | the release this version pins (`.cjls-version`), the one it is tested with |
| pre-release | odd minor (`0.3.<date>`) | cjls's `nightly-build`, rebuilt every night master moves |

VS Code's **Switch to Pre-Release Version** picks the channel.

## The server binary

In this order:

1. `cjls.server.path`, a `cjls` of your own (a build: `target/release/bin/cjls`);
2. the one inside the extension: macOS arm64, Linux x64, Windows x64;
3. `cjls` on `PATH`, on any other platform (the universal VSIX has none inside).

| Setting | |
|---|---|
| `cjls.server.path` | the binary to run |
| `cjls.server.extraEnv` | its environment: `{ "CJLS_LOG_LEVEL": "DEBUG" }` |
| `cjls.trace.server` | `messages` or `verbose` traces the protocol into the `cjls` output channel |

Commands: **cjls: Restart the language server**, **cjls: Show the language server's log**. A
change to `cjls.server.*` restarts it.

## Expand macro

**Cangjie: Expand Macro**, on a macro call's head (`@`, its name, its attribute), shows what the
call expands to in a read-only document beside the editor, as cjls's `cjls/expandMacro` answers it:
the macro server's output for a macro of the workspace, cjls's own (signatures only) for one of std.
The command is there once the server says it expands macros (`experimental.expandMacro`).

The server's code action **Expand macro** writes the whole file expanded instead, as `cjc
--debug-macro` does, into `.cjls/expanded/<path>.cj.macrocall` under the project's root, and opens
it: hover and go to definition work there while it is what the server would write now (cjls's
[D103](https://github.com/ide4cj/cjls/blob/master/docs/adr/0103-an-expansion-is-shown-as-a-request-and-as-a-read-only-file.md)).
A `.cj.macrocall` file is Cangjie.

## The server's settings

The other `cjls.*` settings are the server's own, such as `cjls.linkedProjects` (projects to load
besides those found in the workspace) and `cjls.cangjieHome` (the Cangjie SDK): **Preferences: Open
Settings** → *cjls* lists them with what they do. The extension passes the section `cjls` to the
server as it starts, and a cjls that prints its settings' schema asks for it again whenever it
changes, without a restart (cjls's [D79](https://github.com/ide4cj/cjls/blob/master/docs/adr/0079-settings-are-r1s.md)).

They are generated into `package.json` from the schema the server prints, `cjls --config-schema`:
`npm run settings -- /path/to/cjls` writes them, and CI fails while they are not those of the cjls
`.cjls-version` pins. A setting of a newer cjls than the one running is left alone by it.

## Development

```sh
npm ci
npm run build                      # tsc, then esbuild into dist/extension.js
CJLS_BIN=/path/to/cjls npm test    # VS Code on test/fixture; the server's cases need CJLS_BIN
VSCODE_VERSION=insiders npm test
npm run fetch-cjls -- nightly-build darwin-arm64 && npx vsce package --target darwin-arm64
npm run settings -- /path/to/cjls  # the server's settings into package.json, from its schema
```

F5 in VS Code runs it in an Extension Development Host. A change the server has to make first is a
branch of the same name here and in cjls, each CI testing the other's (cjls's D32,
[CONTRIBUTING](https://github.com/ide4cj/.github/blob/master/CONTRIBUTING.md)).

Releases: `bump.yml` once Renovate's PR moves `.cjls-version` (the stable channel), `nightly.yml`
every night (the pre-release). Publishing needs the secrets `VSCE_PAT` (Marketplace, publisher
`ide4cj`) and `OVSX_PAT` (Open VSX, namespace `ide4cj`); without them the VSIXes go to the GitHub
release alone.

## License

MIT or Apache-2.0, as cjls.
