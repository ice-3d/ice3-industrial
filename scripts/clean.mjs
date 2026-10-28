import { rm } from 'node:fs/promises';

await rm(new URL('../packages/industrial-core/dist', import.meta.url), {
  force: true,
  recursive: true,
});
