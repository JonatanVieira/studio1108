import {readFile, writeFile, mkdir, readdir, copyFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const project = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
function option(name, fallback) { const i=args.indexOf(name); return i<0?fallback:args[i+1]; }
const rawBase = option('--base', process.env.PAGES_BASE_PATH || '');
assert(typeof rawBase==='string' && !/[?#\\\\]/.test(rawBase), 'Invalid base path');
const base = rawBase==='/'?'':rawBase.replace(/\/$/,'');
assert(base==='' || /^\/[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(base), 'Use an absolute URL path, not a domain');
assert(!base.split('/').some(x=>x==='.'||x==='..'), 'Invalid base path segment');
const input = path.join(project,'dist');
const output = path.resolve(project, option('--out','.pages-build'));
assert(output.startsWith(path.join(project,'.pages-build')), 'Output must be a new .pages-build directory inside this project');
try { await stat(output); throw new Error('Output already exists. Choose a new --out path to preserve it.'); }
catch (error) { if(error.code!=='ENOENT')throw error; }
await mkdir(output,{recursive:true});
const textTypes = new Set(['.html','.css','.js','.json','.webmanifest']);
const files=[];
async function copyDirectory(directory, relative='') {
  for(const entry of await readdir(directory,{withFileTypes:true})) {
    assert(!entry.isSymbolicLink(),'Symlinks are not allowed in publication');
    if(entry.name.startsWith('.'))continue;
    const rel=path.posix.join(relative,entry.name);
    const source=path.join(directory,entry.name), target=path.join(output,rel);
    if(entry.isDirectory()){await mkdir(target,{recursive:true});await copyDirectory(source,rel);continue;}
    files.push(rel);
    // Never modify Unity's exported binary/loader bytes or their integrity hashes.
    if(!rel.startsWith('game/builds/') && textTypes.has(path.extname(rel))) {
      const original=await readFile(source,'utf8');
      const adjusted=original.replace(/(["'])\/(?!\/)([^"'\r\n]*)\1/g,
        (match,quote,localPath)=>quote+base+'/'+localPath+quote);
      await writeFile(target,adjusted);
    } else await copyFile(source,target);
  }
}
await copyDirectory(input);
await writeFile(path.join(output,'.nojekyll'),'');
function localFile(url) {
  const pathname=new URL(url,'https://local.invalid').pathname;
  assert(pathname.startsWith(base+'/'),'Reference escaped the publication base: '+url);
  let relative=decodeURIComponent(pathname.slice(base.length+1));
  if(relative.endsWith('/') || !relative)relative+='index.html';
  return path.join(output,relative);
}
for(const rel of files.filter(x=>x.endsWith('.html'))) {
  const html=await readFile(path.join(output,rel),'utf8');
  for(const match of html.matchAll(/(?:href|src)="(\/[^"]*)"/g))await stat(localFile(match[1]));
}
const manifest=JSON.parse(await readFile(path.join(output,'vialchemy.webmanifest'),'utf8'));
assert.equal(manifest.start_url,base+'/jogar/?origem=tela-inicial');
assert.equal(manifest.id,base+'/jogar/');
assert.equal(manifest.scope,base+'/');
for(const icon of manifest.icons)await stat(localFile(icon.src));
const game=JSON.parse(await readFile(path.join(output,'game/manifest.json'),'utf8'));
assert.equal(game.entry,base+'/game/');
const build=JSON.parse(await readFile(path.join(output,'game/build.json'),'utf8'));
for(const item of Object.values(build.files))
  for(const part of item.parts || [item])assert.equal((await stat(localFile(part.url))).size,part.bytes);
console.log(JSON.stringify({files:files.length,basePath:base||'/',output,gameIncluded:game.ready}));
