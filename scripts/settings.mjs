// The server's settings in package.json, from the JSON Schema `cjls --config-schema` prints (cjls's
// D32, D79): a property `cjls.<key>` per setting, its description as `markdownDescription`. The
// client's own (`cjls.server.*`, `cjls.trace.*`) stay as written; every other `cjls.*` is the server's
// and made again.
//
//   node scripts/settings.mjs <cjls>            # writes package.json
//   node scripts/settings.mjs --check <cjls>    # fails when package.json is not what it would write
//
// A cjls before its settings had a schema prints none: the check then passes, with a notice.

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
const SECTION = 'cjls';
const CLIENT_OWN = ['server', 'trace'];

/** The schema the binary prints, or undefined when it knows no `--config-schema`. */
function schemaOf(cjls) {
  try {
    return JSON.parse(execFileSync(cjls, ['--config-schema'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  } catch (e) {
    if (String(e.stderr).includes('no command `--config-schema`')) {
      return undefined;
    }
    throw e;
  }
}

/** package.json's `contributes.configuration.properties` with the server's settings from `schema`. */
function withSettings(properties, schema) {
  const own = Object.fromEntries(
    Object.entries(properties).filter(([key]) => CLIENT_OWN.some((prefix) => key.startsWith(`${SECTION}.${prefix}.`))),
  );
  const server = Object.entries(schema.properties ?? {}).map(([key, { description, ...rest }]) => {
    if (CLIENT_OWN.includes(key)) {
      throw new Error(`the server's setting \`${key}\` is a prefix of the client's own`);
    }
    return [`${SECTION}.${key}`, { ...rest, ...(description === undefined ? {} : { markdownDescription: description }) }];
  });
  return { ...own, ...Object.fromEntries(server) };
}

function main(args) {
  const check = args[0] === '--check';
  const cjls = check ? args[1] : args[0];
  if (!cjls) {
    throw new Error('usage: node scripts/settings.mjs [--check] <cjls>');
  }
  const schema = schemaOf(cjls);
  if (!schema) {
    console.log(`::notice::${cjls} prints no settings' schema: package.json is not checked against it`);
    return 0;
  }
  // a checkout on Windows may have CRLF; what this writes has LF
  const text = fs.readFileSync(PACKAGE, 'utf8').replace(/\r\n/g, '\n');
  const pkg = JSON.parse(text);
  const configuration = pkg.contributes.configuration;
  configuration.properties = withSettings(configuration.properties, schema);
  const made = JSON.stringify(pkg, null, 2) + '\n';
  if (!check) {
    fs.writeFileSync(PACKAGE, made);
    return 0;
  }
  if (made !== text) {
    console.log(`::error::package.json's settings are not those of ${cjls}: run \`npm run settings -- ${cjls}\``);
    return 1;
  }
  return 0;
}

process.exitCode = main(process.argv.slice(2));
