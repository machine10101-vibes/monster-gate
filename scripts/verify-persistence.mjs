import { spawnSync } from 'node:child_process';
const result = spawnSync('npm', ['run','test:persistence'], { stdio: 'inherit', shell: process.platform === 'win32' });
if (result.error || result.status !== 0) process.exit(1);
console.log('Persistence suite passed; live database and offline browser recovery are not verified by this script.');
