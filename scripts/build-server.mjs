import {build} from 'esbuild';
import fs from 'node:fs/promises';
await build({entryPoints:['apps-script/helpers-entry.js'],bundle:true,format:'iife',globalName:'SC',platform:'browser',target:'es2020',outfile:'apps-script/Helpers.gs',banner:{js:'var structuredClone = function(value){return JSON.parse(JSON.stringify(value));};'}});
const code=await fs.readFile('apps-script/Code.gs','utf8');
await fs.writeFile('apps-script/Server.gs',(await fs.readFile('apps-script/Helpers.gs','utf8'))+'\n'+code);
console.log('Apps Script Server.gs generated. Use Server.gs OR Code.gs + Helpers.gs, not both.');
