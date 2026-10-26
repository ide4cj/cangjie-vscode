# Changelog
All notable changes to this project will be documented in this file. See [conventional commits](https://www.conventionalcommits.org/) for commit guidelines.

- - -
## [v0.6.0](https://github.com/ide4cj/cangjie-vscode/compare/043d86a421f43af2ec7e9387a946c64fb9be4f91..v0.6.0) - 2026-10-26
#### Features
- (**highlighting**) the server's constructor and constant modifiers map to the grammar's scopes (#15) - ([e9aa993](https://github.com/ide4cj/cangjie-vscode/commit/e9aa993322ce537c01b158de1bec3c04507ae5db)) - FilaCo
- protect binary library sources for the editor session (#22) - ([bfefa6e](https://github.com/ide4cj/cangjie-vscode/commit/bfefa6e11a43cc7b59d48bc234952d04716b49e9)) - FilaCo
- the expand macro command is cjls: Expand macro, as the extension's other commands (#19) - ([0e6f48d](https://github.com/ide4cj/cangjie-vscode/commit/0e6f48de6fedce7af664166179a7069ee4d8b93f)) - FilaCo
- Cangjie: Expand Macro, in a virtual document (#14) - ([b1a7d36](https://github.com/ide4cj/cangjie-vscode/commit/b1a7d3665c145317a98ed259661cea61fcbbce67)) - FilaCo
#### Bug Fixes
- (**cjls**) update cjls to v0.6.0 (#24) - ([291bc30](https://github.com/ide4cj/cangjie-vscode/commit/291bc306d38d5ccb5b90cefaa9e177418085e919)) - renovate[bot]
- a word is Unicode's, so completion comes up as one types (#20) - ([b5af506](https://github.com/ide4cj/cangjie-vscode/commit/b5af5061e0650ba20890b1ee55a4771ad84f8fb8)) - FilaCo
#### Continuous Integration
- the stable release on the pinned cjls's minor, the pre-release a minor ahead (cjls's D132) (#21) - ([12f21bf](https://github.com/ide4cj/cangjie-vscode/commit/12f21bf2b3b5af338ec98226417ea5f0119d65a4)) - FilaCo
- the server's settings made again in the PR that moves the pin, never checked against the cjls under test (#16) - ([043d86a](https://github.com/ide4cj/cangjie-vscode/commit/043d86a421f43af2ec7e9387a946c64fb9be4f91)) - FilaCo
#### Miscellaneous Chores
- (**deps**) update dependency ovsx to v1.3.0 (#23) - ([db03636](https://github.com/ide4cj/cangjie-vscode/commit/db03636efeac64626e7258e5e7f62a51ceaa018d)) - renovate[bot]
- (**deps**) update dependency node to v24 (#13) - ([a81c558](https://github.com/ide4cj/cangjie-vscode/commit/a81c558b43fef75b117941eb2dce38b5311917f1)) - renovate[bot]
- (**deps**) update actions/setup-node action to v7 (#12) - ([d1d1e3e](https://github.com/ide4cj/cangjie-vscode/commit/d1d1e3ee97287e144ef41eeefac51410a145bde9)) - renovate[bot]

- - -

## [v0.4.0](https://github.com/ide4cj/cangjie-vscode/compare/a606455ef86a5763157530048fcd6954863513c7..v0.4.0) - 2026-10-12
#### Features
- the server's settings, generated from cjls --config-schema and passed as the section cjls (#7) - ([486eae6](https://github.com/ide4cj/cangjie-vscode/commit/486eae67d96aa096f4b1dcc50dc9abfdd6f322be)) - FilaCo
#### Bug Fixes
- (**cjls**) update cjls to v0.5.0 (#10) - ([2d0026b](https://github.com/ide4cj/cangjie-vscode/commit/2d0026be827706b2e7fe41ed608b1815a625080a)) - renovate[bot]
- a hover's code colored by the grammar alone: types, parameters, declared names (#6) - ([a606455](https://github.com/ide4cj/cangjie-vscode/commit/a606455ef86a5763157530048fcd6954863513c7)) - FilaCo
#### Miscellaneous Chores
- (**deps**) update actions/create-github-app-token action to v3 (#11) - ([7f3283a](https://github.com/ide4cj/cangjie-vscode/commit/7f3283a9f0223142d09aee95044edb100a64e5a3)) - renovate[bot]
- (**deps**) update actions/checkout action to v7 (#9) - ([a523eca](https://github.com/ide4cj/cangjie-vscode/commit/a523eca9cab9c4eaa68a1b11a1711d78bcd93694)) - renovate[bot]
- (**deps**) update @types/node to v22.20.5 (#8) - ([a6a1443](https://github.com/ide4cj/cangjie-vscode/commit/a6a1443cde294a9ae09f3375c874b38667032d44)) - renovate[bot]

- - -

## [v0.2.1](https://github.com/ide4cj/cangjie-vscode/compare/7edd282c3892357232dc5dda68f1d8df9bce6d36..v0.2.1) - 2026-10-09
#### Bug Fixes
- (**cjls**) update cjls to v0.4.0 (#5) - ([84ee799](https://github.com/ide4cj/cangjie-vscode/commit/84ee7999f30bb039b4a7351ec12d3c499e48a276)) - FilaCo
- cjls's nightly is its release nightly-build (#2) - ([7edd282](https://github.com/ide4cj/cangjie-vscode/commit/7edd282c3892357232dc5dda68f1d8df9bce6d36)) - FilaCo
#### Tests
- cjls answers the folding ranges of a file (#3) - ([4f682e1](https://github.com/ide4cj/cangjie-vscode/commit/4f682e1ae87abd1803aec006bac2503470ff360d)) - FilaCo

- - -

## [v0.2.0](https://github.com/ide4cj/cangjie-vscode/compare/e40e5e9409ec39d270e212ca2c5902388247b797..v0.2.0) - 2026-10-02
#### Features
- Cangjie in VS Code: cjls inside platform VSIXes, a stable and a pre-release channel (#1) - ([ed8f138](https://github.com/ide4cj/cangjie-vscode/commit/ed8f138bca79d7e9e0e5748067105b52c113f368)) - FilaCo
#### Miscellaneous Chores
- Cangjie for VS Code, the repository - ([e40e5e9](https://github.com/ide4cj/cangjie-vscode/commit/e40e5e9409ec39d270e212ca2c5902388247b797)) - FilaCo

- - -

