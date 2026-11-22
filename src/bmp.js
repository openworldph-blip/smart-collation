// Uncompressed 24-bit Windows BMP; rows are padded to 4 bytes and stored bottom-up.
export function encodeBMP(width,height,rgba){
 const stride=Math.ceil(width*3/4)*4,size=54+stride*height;
 const bytes=new Uint8Array(size),view=new DataView(bytes.buffer);
 bytes[0]=66;bytes[1]=77;view.setUint32(2,size,true);view.setUint32(10,54,true);
 view.setUint32(14,40,true);view.setInt32(18,width,true);view.setInt32(22,height,true);
 view.setUint16(26,1,true);view.setUint16(28,24,true);view.setUint32(34,stride*height,true);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const src=(y*width+x)*4,dst=54+(height-1-y)*stride+x*3;
  const alpha=rgba[src+3]/255,gray=(.299*rgba[src]+.587*rgba[src+1]+.114*rgba[src+2])*alpha+255*(1-alpha),v=gray<180?0:255;
  bytes[dst]=bytes[dst+1]=bytes[dst+2]=v;
 }
 return bytes;
}
export function bmpDataURL(canvas){
 const bytes=encodeBMP(canvas.width,canvas.height,canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data);
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return 'data:image/bmp;base64,'+btoa(binary);
}
