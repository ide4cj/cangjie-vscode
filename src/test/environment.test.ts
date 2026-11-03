import * as assert from 'node:assert/strict';
import { expandExtraEnv } from '../environment';

suite('Server environment', () => {
  test('expands the stdx path and preserves inherited variables and empty overrides', () => {
    const inherited = { HOME: '/home/user', PATH: '/bin', EMPTY: 'old' };
    const warnings: string[] = [];
    const result = expandExtraEnv({
      CANGJIE_STDX_PATH: '$HOME/.cjpm/toolchains/default/linux_x86_64_cjnative/static/stdx',
      PATH: '${PATH}:/tools', EMPTY: '', LOG: 'DEBUG',
    }, inherited, (message) => warnings.push(message));
    assert.equal(result.CANGJIE_STDX_PATH, '/home/user/.cjpm/toolchains/default/linux_x86_64_cjnative/static/stdx');
    assert.equal(result.PATH, '/bin:/tools');
    assert.equal(result.EMPTY, '');
    assert.equal(result.HOME, '/home/user');
    assert.equal(result.LOG, 'DEBUG');
    assert.deepEqual(inherited, { HOME: '/home/user', PATH: '/bin', EMPTY: 'old' });
    assert.deepEqual(warnings, []);
  });

  test('expands home with a Windows fallback and leaves shell expressions literal', () => {
    const warnings: string[] = [];
    const result = expandExtraEnv({ ROOT: '~', SDK: '~\\sdk', SRC: '~/src', LITERAL: '~user/$(pwd)' },
      { USERPROFILE: 'C:\\Users\\user' }, (message) => warnings.push(message));
    assert.equal(result.ROOT, 'C:\\Users\\user');
    assert.equal(result.SDK, 'C:\\Users\\user\\sdk');
    assert.equal(result.SRC, 'C:\\Users\\user/src');
    assert.equal(result.LITERAL, '~user/$(pwd)');
    assert.deepEqual(warnings, []);
    assert.equal(expandExtraEnv({ ROOT: '~' }, { HOME: '/home/user', USERPROFILE: '/fallback' }, () => {}).ROOT, '/home/user');
  });

  test('does not recursively expand inserted values or depend on extraEnv key order', () => {
    const inherited = { HOME: '/home/user', SDK: '$HOME/sdk' };
    const extra = { HOME: '/override', SDK: '${SDK}', COPY: '$HOME', TILDE: '$SDK' };
    const expected = { HOME: '/override', SDK: '$HOME/sdk', COPY: '/home/user', TILDE: '$HOME/sdk' };
    assert.deepEqual(expandExtraEnv(extra, inherited, () => {}), expected);
    assert.deepEqual(expandExtraEnv(Object.fromEntries(Object.entries(extra).reverse()), inherited, () => {}), expected);
  });

  test('keeps missing references with warnings that do not reveal values', () => {
    const warnings: string[] = [];
    const result = expandExtraEnv({ TOKEN: 'secret-${MISSING}-$MISSING', SDK: '~/sdk', EMPTY: '$EMPTY' },
      { EMPTY: '' }, (message) => warnings.push(message));
    assert.equal(result.TOKEN, 'secret-${MISSING}-$MISSING');
    assert.equal(result.SDK, '~/sdk');
    assert.equal(result.EMPTY, '');
    assert.equal(warnings.length, 2);
    assert.ok(warnings[0].includes('TOKEN') && warnings[0].includes('MISSING'));
    assert.ok(warnings[1].includes('SDK'));
    assert.ok(warnings.every((message) => !message.includes('secret-')));
  });
});
