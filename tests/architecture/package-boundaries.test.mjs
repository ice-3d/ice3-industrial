import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);

async function packageJson(path) {
  return JSON.parse(await readFile(new URL(path, root), 'utf8'));
}

test('industrial-core has no runtime dependencies', async () => {
  const manifest = await packageJson(
    'packages/industrial-core/package.json',
  );

  assert.equal(manifest.name, '@ice3/industrial-core');
  assert.deepEqual(manifest.dependencies ?? {}, {});
  assert.deepEqual(manifest.peerDependencies ?? {}, {});
  assert.deepEqual(manifest.optionalDependencies ?? {}, {});
});

test('root workspace keeps package discovery deterministic', async () => {
  const manifest = await packageJson('package.json');
  assert.deepEqual(manifest.workspaces, ['packages/*']);
});
