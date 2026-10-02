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
| pre-release | odd minor (`0.3.<date>`) | cjls's `nightly`, rebuilt every night master moves |

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

## Development

```sh
npm ci
npm run build                      # tsc, then esbuild into dist/extension.js
CJLS_BIN=/path/to/cjls npm test    # VS Code on test/fixture; the server's cases need CJLS_BIN
VSCODE_VERSION=insiders npm test
npm run fetch-cjls -- nightly darwin-arm64 && npx vsce package --target darwin-arm64
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
