import { spawnSync } from 'node:child_process';
for (const args of [['run','build'], ['test'], ['run','test:smoke']]) {
  const result = spawnSync('npm', args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error || result.status !== 0) process.exit(1);
}
console.log('Automated gameplay checks passed. Manual browser checks remain required.');
