export const AUTH_KEY='smart-collation:auth:v1';
export const emptyCredentials=()=>({admin:null,branches:{}});
export function readCredentials(raw){try{const a=JSON.parse(raw);if(!a||!a.branches||typeof a.branches!=='object'||Array.isArray(a.branches))return emptyCredentials();return {admin:a.admin||null,branches:a.branches};}catch{return emptyCredentials();}}
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const bytes=hex=>new Uint8Array(hex.match(/.{2}/g).map(x=>parseInt(x,16)));
export async function passwordRecord(password){
 if(typeof password!=='string'||password.length<8)throw Error('Use at least 8 characters.');
 if(!globalThis.crypto?.subtle)throw Error('This browser cannot securely create a password verifier. Use a current Edge or Chrome browser.');
 const salt=globalThis.crypto.getRandomValues(new Uint8Array(16)),iterations=160000;
 const key=await globalThis.crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const result=await globalThis.crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations},key,256);
 return {salt:hex(salt),hash:hex(new Uint8Array(result)),iterations,version:hex(globalThis.crypto.getRandomValues(new Uint8Array(12)))};
}
export async function verifyPassword(password,record){
 if(!record||!/^[a-f0-9]{32}$/.test(record.salt)||!/^[a-f0-9]{64}$/.test(record.hash)||!Number.isInteger(record.iterations)||record.iterations<100000||record.iterations>1000000)return false;
 const key=await globalThis.crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const result=new Uint8Array(await globalThis.crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:bytes(record.salt),iterations:record.iterations},key,256)),expected=bytes(record.hash);
 return result.reduce((diff,b,i)=>diff|(b^expected[i]),0)===0;
}
