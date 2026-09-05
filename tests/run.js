/* Chạy toàn bộ kiểm thử logic: node tests/run.js  (hoặc: node --test tests/) */
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dir = __dirname;
const files = fs.readdirSync(dir).filter((f) => /\.test\.js$/.test(f)).map((f) => path.join(dir, f));
if (!files.length) { console.log('Không có tệp *.test.js'); process.exit(0); }
const r = spawnSync(process.execPath, ['--test'].concat(files), { stdio: 'inherit' });
process.exit(r.status == null ? 1 : r.status);
