import { spawn } from 'child_process';
import path from 'path';

const cargoBin = 'C:\\Users\\gabri\\.cargo\\bin';
process.env.PATH = `${process.env.PATH};${cargoBin}`;

console.log('Iniciando Elements Launcher (Tauri Dev)...');
const child = spawn('npx', ['tauri', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

child.on('error', (err) => {
  console.error('Erro ao iniciar:', err);
});
