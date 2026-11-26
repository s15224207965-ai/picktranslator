import * as esbuild from 'esbuild';
import fs from 'node:fs';

const common = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: false,
  logLevel: 'info'
};

// 主进程
await esbuild.build({
  ...common,
  entryPoints: ['src/main/index.ts'],
  outfile: 'dist/main/index.js',
  external: ['electron']
});

// preload
await esbuild.build({
  ...common,
  entryPoints: ['src/preload/index.ts'],
  outfile: 'dist/preload/index.js',
  external: ['electron']
});

// 渲染层（browser 平台）
await esbuild.build({
  bundle: true,
  platform: 'browser',
  target: 'chrome120',
  format: 'iife',
  entryPoints: ['src/renderer/panel.ts', 'src/renderer/settings.ts'],
  outdir: 'dist/renderer',
  logLevel: 'info'
});

// 静态资源
fs.mkdirSync('dist/renderer', { recursive: true });
for (const f of ['panel.html', 'settings.html', 'styles.css']) {
  fs.copyFileSync(`src/renderer/${f}`, `dist/renderer/${f}`);
}

console.log('build done');