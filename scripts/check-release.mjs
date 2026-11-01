import fs from 'node:fs/promises';
const config=JSON.parse(await fs.readFile('public/config.json','utf8'));
if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(config.apiUrl||''))throw Error('Release blocked: configure the verified Apps Script web app URL in public/config.json first.');
const response=await fetch(config.apiUrl,{redirect:'follow'});
if(!response.ok)throw Error('Release blocked: Apps Script is unreachable.');
const data=await response.json();
if(!data.ok||data.service!=='Smart Collation')throw Error('Release blocked: unexpected Apps Script response.');
console.log('Apps Script endpoint is configured and reachable. Complete the live branch submission check before sharing the QR.');
