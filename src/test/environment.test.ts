import * as assert from 'node:assert/strict';
import { expandExtraEnv } from '../environment';

suite('Server environment', () => {
  test('expands the stdx path and preserves inherited variables and empty overrides', () => {
    // arrange
    const inherited = { HOME: '/home/user', PATH: '/bin', EMPTY: 'old' };
    const extra = {
      CANGJIE_STDX_PATH: '$HOME/.cjpm/toolchains/default/linux_x86_64_cjnative/static/stdx',
      PATH: '${PATH}:/tools',
      EMPTY: '',
      LOG: 'DEBUG',
    };
    const warnings: string[] = [];

    // act
    const result = expandExtraEnv(extra, inherited, (message) => warnings.push(message));

    // assert
    assert.equal(result.CANGJIE_STDX_PATH, '/home/user/.cjpm/toolchains/default/linux_x86_64_cjnative/static/stdx');
    assert.equal(result.PATH, '/bin:/tools');
    assert.equal(result.EMPTY, '');
    assert.equal(result.HOME, '/home/user');
    assert.equal(result.LOG, 'DEBUG');
    assert.deepEqual(inherited, { HOME: '/home/user', PATH: '/bin', EMPTY: 'old' });
    assert.equal(extra.PATH, '${PATH}:/tools');
    assert.deepEqual(warnings, []);
  });

  test('expands home with a Windows fallback and leaves shell expressions literal', () => {
    // arrange
    const extra = { ROOT: '~', SDK: '~\\sdk', SRC: '~/src', LITERAL: '~user/$(pwd)', DEFAULT: '${HOME:-/tmp}' };
    const inherited = { USERPROFILE: 'C:\\Users\\user' };
    const warnings: string[] = [];

    // act
    const result = expandExtraEnv(extra, inherited, (message) => warnings.push(message));

    // assert
    assert.equal(result.ROOT, 'C:\\Users\\user');
    assert.equal(result.SDK, 'C:\\Users\\user\\sdk');
    assert.equal(result.SRC, 'C:\\Users\\user/src');
    assert.equal(result.LITERAL, '~user/$(pwd)');
    assert.equal(result.DEFAULT, '${HOME:-/tmp}');
    assert.deepEqual(warnings, []);
  });

  test('uses inherited HOME before USERPROFILE and extraEnv for variable references', () => {
    // arrange
    const inherited = { HOME: '/home/user', USERPROFILE: '/fallback' };
    const extra = { HOME: '/override', ROOT: '~', COPY: '$HOME' };
    const warnings: string[] = [];

    // act
    const result = expandExtraEnv(extra, inherited, (message) => warnings.push(message));

    // assert
    assert.equal(result.ROOT, '/home/user');
    assert.equal(result.COPY, '/override');
    assert.deepEqual(warnings, []);
  });

  test('resolves chains of extraEnv references independently of key order', () => {
    // arrange
    const inherited = { SDK: '/old/sdk' };
    const extra = { STDX: '${SDK}/static/stdx', SDK: '$ROOT/sdk', ROOT: '~/toolchain', EMPTY: '', COPY: '$EMPTY' };
    const reversed = Object.fromEntries(Object.entries(extra).reverse());
    const environment = { ...inherited, HOME: '/home/user' };
    const expected = {
      HOME: '/home/user', ROOT: '/home/user/toolchain', SDK: '/home/user/toolchain/sdk',
      STDX: '/home/user/toolchain/sdk/static/stdx', EMPTY: '', COPY: '',
    };
    const warnings: string[] = [];

    // act
    const result = expandExtraEnv(extra, environment, (message) => warnings.push(message));
    const reversedResult = expandExtraEnv(reversed, environment, (message) => warnings.push(message));

    // assert
    assert.deepEqual(result, expected);
    assert.deepEqual(reversedResult, expected);
    assert.deepEqual(warnings, []);
  });

  test('does not expand variables or tildes inserted from the inherited environment', () => {
    // arrange
    const inherited = { HOME: '/home/user', SDK: '$HOME/sdk', SOURCE: '~/src' };
    const extra = { SDK: '${SDK}', COPY: '$SDK', SOURCE: '$SOURCE', SRC_COPY: '$SOURCE' };
    const warnings: string[] = [];

    // act
    const result = expandExtraEnv(extra, inherited, (message) => warnings.push(message));

    // assert
    assert.equal(result.SDK, '$HOME/sdk');
    assert.equal(result.COPY, '$HOME/sdk');
    assert.equal(result.SOURCE, '~/src');
    assert.equal(result.SRC_COPY, '~/src');
    assert.deepEqual(warnings, []);
  });

  test('keeps missing references with warnings that do not reveal values', () => {
    // arrange
    const extra = { TOKEN: 'secret-${MISSING}-$MISSING', SDK: '~/sdk', EMPTY: '$EMPTY', COPY: '$TOKEN', SELF: '$SELF' };
    const inherited = { EMPTY: '' };
    const warnings: string[] = [];

    // act
    const result = expandExtraEnv(extra, inherited, (message) => warnings.push(message));

    // assert
    assert.equal(result.TOKEN, 'secret-${MISSING}-$MISSING');
    assert.equal(result.SDK, '~/sdk');
    assert.equal(result.EMPTY, '');
    assert.equal(result.COPY, 'secret-${MISSING}-$MISSING');
    assert.equal(result.SELF, '$SELF');
    assert.deepEqual(warnings, [
      'cjls.server.extraEnv.TOKEN: environment variables are not set: MISSING; keeping references',
      'cjls.server.extraEnv.SDK: HOME and USERPROFILE do not provide a home directory; keeping ~',
      'cjls.server.extraEnv.COPY: environment variables are not set: MISSING; keeping references',
      'cjls.server.extraEnv.SELF: environment variables are not set: SELF; keeping references',
    ]);
  });

  test('keeps entries affected by a cycle unchanged regardless of key order', () => {
    // arrange
    const extra = { A: 'secret-a/$B', B: 'secret-b/${A}', COPY: '$A', OK: '$HOME/ok' };
    const reversed = Object.fromEntries(Object.entries(extra).reverse());
    const inherited = { HOME: '/home/user', A: '/old/a' };
    const expected = { HOME: '/home/user', A: extra.A, B: extra.B, COPY: extra.COPY, OK: '/home/user/ok' };
    const warnings: string[] = [];
    const reversedWarnings: string[] = [];

    // act
    const result = expandExtraEnv(extra, inherited, (message) => warnings.push(message));
    const reversedResult = expandExtraEnv(reversed, inherited, (message) => reversedWarnings.push(message));

    // assert
    assert.deepEqual(result, expected);
    assert.deepEqual(reversedResult, expected);
    assert.deepEqual(warnings, ['A', 'B', 'COPY'].map((key) =>
      `cjls.server.extraEnv.${key}: cyclic extraEnv references; keeping configured value`,
    ));
    assert.deepEqual(reversedWarnings, [...warnings].reverse());
  });

  test('ignores object prototype properties when looking up variables', () => {
    // arrange
    const extra = { VALUE: '$toString' };
    const warnings: string[] = [];

    // act
    const result = expandExtraEnv(extra, {}, (message) => warnings.push(message));

    // assert
    assert.equal(result.VALUE, '$toString');
    assert.deepEqual(warnings, [
      'cjls.server.extraEnv.VALUE: environment variables are not set: toString; keeping references',
    ]);
  });
});
