import React,{useMemo,useState,useEffect} from 'react';

export default function ImageActions({image,name=image.name,label='Save JPG'}){
 const [message,setMessage]=useState('');
 const blob=useMemo(()=>{const [header,data]=image.url.split(',');return new Blob([Uint8Array.from(atob(data),c=>c.charCodeAt(0))],{type:header.match(/:(.*?);/)[1]});},[image.url]);
 const url=useMemo(()=>URL.createObjectURL(blob),[blob]);
 useEffect(()=>()=>URL.revokeObjectURL(url),[url]);
 async function share(){try{const file=new File([blob],name,{type:blob.type});if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file]});setMessage('');}else{setMessage('Open the image, then touch and hold it to save or share.');}}catch(e){if(e.name!=='AbortError')setMessage('Sharing is unavailable here. Open the image to save or share it.');}}
 return <div className="receipt-actions"><a className="button secondary" href={url} download={name}>{label}</a><button className="button secondary" onClick={share}>Share image</button><a className="button secondary" href={url} target="_blank" rel="noopener">Open image</a>{message&&<span role="status">{message}</span>}</div>;
}
