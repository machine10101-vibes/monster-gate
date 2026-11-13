import { createWorldServer } from './world.js';

const PORT = Number(process.env.PORT || 8080);

const { close, server, world } = await createWorldServer({ port: PORT });
const addr = server.address();
console.log(`monster-gate world v1 on :${addr.port} (${world.size} hunters)`);

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    await close();
  } finally {
    process.exit(0);
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => { void shutdown(); });
}
