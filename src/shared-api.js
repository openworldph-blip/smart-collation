let endpoint='',token='';
export async function configure(){const response=await fetch(new URL('../public/config.json',import.meta.url),{cache:'no-store'});const config=await response.json();if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(config.apiUrl||''))throw Error('The shared server is not connected yet. Finish Apps Script setup before using this site.');endpoint=config.apiUrl;}
export function setToken(value){token=value||'';}
export async function api(action,payload={}){
 if(!endpoint)throw Error('The shared server is not connected.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
 try{const response=await fetch(endpoint,{method:'POST',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...payload,token}),cache:'no-store',signal:controller.signal});
 if(!response.ok)throw Error('The shared server could not be reached. Try again.');
 let result;try{result=await response.json();}catch{throw Error('The server did not return app data. Check the Apps Script deployment and access settings.');}
 if(!result.ok)throw Error(result.error||'The request could not be saved.');return result.data;
 }catch(err){if(err.name==='AbortError')throw Error('The connection timed out. Check the saved status before trying again.');if(err instanceof TypeError)throw Error('Could not connect. Check your internet connection and try again.');throw err;}finally{clearTimeout(timeout);}
}
export async function signIn(scope,password){const {salt,iterations}=await api('challenge',{scope}),bytes=new Uint8Array(salt.match(/../g).map(x=>parseInt(x,16))),key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']),bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:bytes,iterations},key,256),proof=Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('');const result=await api('login',{scope,proof});setToken(result.token);return result.snapshot;}
