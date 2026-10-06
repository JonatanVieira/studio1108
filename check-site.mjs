import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('dist');
let count=0;
async function walk(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory()){await walk(file);continue;}const size=(await stat(file)).size;assert(size<25*1024*1024,'Static file exceeds 25 MiB: '+file);count++;if(!entry.name.endsWith('.html'))continue;const html=await readFile(file,'utf8');assert(html.includes('lang="pt-BR"'),'Missing language');assert(html.includes('name="viewport"'),'Missing viewport');for(const match of html.matchAll(/(?:href|src)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)){let target=path.join(root,match[1]);if(match[1].endsWith('/'))target=path.join(target,'index.html');await stat(target);}}}
await walk(root);
const game=JSON.parse(await readFile('dist/game/manifest.json','utf8'));
if(game.ready){const build=JSON.parse(await readFile('dist/game/build.json','utf8'));for(const asset of Object.values(build.files)){for(const part of asset.parts||[asset])assert.equal((await stat(path.join(root,part.url))).size,part.bytes);}}
const app = JSON.parse(await readFile('dist/vialchemy.webmanifest','utf8'));
assert.equal(app.id, '/jogar/');
assert.equal(app.start_url, '/jogar/?origem=tela-inicial');
assert.equal(app.display, 'fullscreen');
for (const icon of [...app.icons, {src:'/assets/app-icon-180.png', sizes:'180x180'}]) {
  const png = await readFile(path.join(root,icon.src));
  assert.equal(png.subarray(1,4).toString(), 'PNG');
  const [width,height] = icon.sizes.split('x').map(Number);
  assert.equal(png.readUInt32BE(16),width,'Incorrect icon width');
  assert.equal(png.readUInt32BE(20),height,'Incorrect icon height');
}
console.log(JSON.stringify({checkedFiles:count,routes:['/','/vialchemy/','/jogar/','/game/'],gameIntegrated:game.ready}));
