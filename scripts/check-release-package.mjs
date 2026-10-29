import { spawnSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const packageRoot = join(root, 'packages', 'industrial-core');
const artifacts = join(root, 'release', 'artifacts');

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed:\n${result.stdout}${result.stderr}`,
    );
  }
  return result.stdout;
}

await mkdir(artifacts, { recursive: true });
const packed = JSON.parse(run(
  'npm',
  ['pack', packageRoot, '--json', '--pack-destination', artifacts],
  root,
));
const tarball = join(artifacts, packed[0].filename);
const consumer = await mkdtemp(join(tmpdir(), 'ice3-industrial-consumer-'));
try {
  await writeFile(
    join(consumer, 'package.json'),
    '{"private":true,"type":"module"}\n',
  );
  run(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball],
    consumer,
  );
  run(process.execPath, [
    '--input-type=module',
    '--eval',
    "import { ICEIndustrialWorkspace } from '@ice3/industrial-core'; if (typeof ICEIndustrialWorkspace !== 'function') process.exit(1);",
  ], consumer);
  await writeFile(
    join(consumer, 'index.ts'),
    "import { ICEIndustrialWorkspace } from '@ice3/industrial-core';\nconst workspace: typeof ICEIndustrialWorkspace = ICEIndustrialWorkspace;\nvoid workspace;\n",
  );
  await writeFile(
    join(consumer, 'tsconfig.json'),
    `${JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        target: 'ES2022',
      },
      include: ['index.ts'],
    }, null, 2)}\n`,
  );
  run(
    join(root, 'node_modules', '.bin', 'tsc'),
    ['--project', 'tsconfig.json'],
    consumer,
  );
  console.info(`ICE3_RELEASE_OK: ${packed[0].filename}`);
} finally {
  await rm(consumer, { recursive: true, force: true });
}
