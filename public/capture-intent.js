export function captureIntent(text){
 const value=text.trim();
 if(/^https:\/\/\S+$/i.test(value))return {type:'article',url:value};
 const explicit=value.match(/^(?:remember(?: this)?|save(?: this)?|note)\s*:\s*([\s\S]+)/i);
 if(explicit)return {type:'note',content:explicit[1].trim()};
 if(value.length>=60&&!/^(?:what|why|how|when|where|who|can|could|would|please|summari[sz]e|explain|compare|find|tell|write)\b/i.test(value)&&!value.endsWith('?'))return {type:'note',content:value};
 return null;
}
