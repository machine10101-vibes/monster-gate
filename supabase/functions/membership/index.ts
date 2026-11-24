import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { bech32 } from "bech32";
const RECEIVER="klv1mhrz0thhdsu4rznyfa27c9jr8hwtnf9f4sf8ef2kajgkup4sdhyqfs0wtv";
const PRICE_URL="https://api.exchange.bitcoin.me/v1/market/ticker?symbol=KLV-USDT";
const CHAIN_API="https://api.mainnet.klever.org";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH=/^[0-9a-f]{64}$/i, ADDR=/^klv1[02-9ac-hj-np-z]{58}$/;
let priceCache:any=null;
type Admin={from:(table:string)=>any;rpc:(fn:string,args:Record<string,unknown>)=>Promise<{data:any,error:any}>};
const out=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
async function userFor(token:any):Promise<any>{
 if(typeof token!=="string"||token.length<20||token.length>8192)return out({error:"Sign in with your game account first."},401);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!key)return out({error:"Membership service unavailable."},503);
 const r=await fetch(url+"/auth/v1/user",{headers:{authorization:"Bearer "+token,apikey:key}});
 if(!r.ok)return out({error:"Your game sign-in expired. Sign in again."},401);
 const u=await r.json();return UUID.test(u?.id||"")?{id:u.id}:out({error:"Invalid game session."},401);
}
async function walletFor(db:Admin,id:string):Promise<any>{
 const {data,error}=await db.from("hunter_accounts").select("klever_address").eq("user_id",id).maybeSingle();
 if(error)return out({error:"Could not check your linked wallet."},503);
 const a=data?.klever_address||"";return ADDR.test(a)?a:"";
}
async function ticker(){
 if(priceCache&&Date.now()-priceCache.at<30000)return priceCache;
 const c=new AbortController(),t=setTimeout(()=>c.abort(),8000);
 try{const r=await fetch(PRICE_URL,{signal:c.signal});if(!r.ok)return null;const j=await r.json(),p=Number(j?.data?.price),sec=Number(j?.data?.time);
 if(j?.success!==true||j?.data?.symbol!=="KLV-USDT"||!Number.isFinite(p)||p<=0)return null;
 const sourceTime=sec>0?new Date(sec*1000).toISOString():null;
 if(sourceTime&&Date.now()-Date.parse(sourceTime)>600000)return null;
 return priceCache={price:p,sourceTime,at:Date.now()};
 }catch{return null}finally{clearTimeout(t)}
}
function b64(s:string){try{const b=atob(s);return Uint8Array.from(b,c=>c.charCodeAt(0))}catch{return new Uint8Array()}}
function vi(b:Uint8Array,i:number){let v=0n,s=0n;while(i<b.length&&s<=63n){const x=b[i++];v|=BigInt(x&127)<<s;if(!(x&128))return{v,i};s+=7n}return null}
function transfer(encoded:string){
 const b=b64(encoded);let i=0,receiver="",amount=0n,asset="";
 while(i<b.length){const tag=vi(b,i);if(!tag||tag.v===0n)return null;i=tag.i;const f=Number(tag.v>>3n),w=Number(tag.v&7n);
 if(w===0){const x=vi(b,i);if(!x)return null;i=x.i;if(f===2)amount=x.v}
 else if(w===2){const l=vi(b,i);if(!l)return null;i=l.i;const n=Number(l.v);if(!Number.isSafeInteger(n)||i+n>b.length)return null;const part=b.slice(i,i+n);i+=n;
 if(f===1){receiver=part.length===32?bech32.encode("klv",bech32.toWords(part),120):new TextDecoder().decode(part)}
 if(f===3)asset=new TextDecoder().decode(part)}
 else if(w===1)i+=8;else if(w===5)i+=4;else return null;if(i>b.length)return null}
 return receiver&&amount>0n?{receiver,amount,asset}:null;
}
function transaction(j:any){return j?.data?.transaction??j?.transaction??j?.data??j}
function validTransfer(j:any,hash:string,from:string,min:bigint,quotedAt:string,quoteExpiresAt:string){
 const tx=transaction(j),reportedHash=String(tx?.hash??j?.data?.hash??j?.hash??"").toLowerCase();
 if(reportedHash&&reportedHash!==hash.toLowerCase())return null;
 const status=String(j?.data?.status??j?.status??tx?.status??tx?.receipt?.status??"").toLowerCase();
 if(!["success","onchain","on-chain","confirmed"].includes(status))return null;
 const stamp=tx?.timestamp??tx?.block?.timestamp??tx?.blockTimestamp??tx?.createdAt??j?.data?.timestamp;
 const numeric=typeof stamp==="number"||/^\\d+(?:\\.\\d+)?$/.test(String(stamp??""))?Number(stamp):Date.parse(String(stamp??""));
 const txMillis=Number.isFinite(numeric)?(numeric<1e12?numeric*1000:numeric):NaN;
 if(!Number.isFinite(txMillis)||txMillis<Date.parse(quotedAt)||txMillis>Date.parse(quoteExpiresAt)||txMillis>Date.now()+60000)return null;
 const raw=tx?.RawData??tx?.rawData??tx?.raw?.RawData??tx?.raw?.rawData??{};
 let sender=String(tx?.sender??tx?.from??tx?.senderAddress??"");
 if(!ADDR.test(sender)){const pub=b64(String(raw?.Sender??raw?.sender??""));if(pub.length===32)sender=bech32.encode("klv",bech32.toWords(pub),120)}
 if(sender!==from)return null;
 // The Klever proxy API exposes parsed transfer receipts (typeString/from/to/value/assetId).
 const receipts=tx?.receipts??tx?.Receipts??[];
 if(Array.isArray(receipts))for(const receipt of receipts){
  const kind=String(receipt?.typeString??receipt?.type_string??"").toLowerCase();
  const asset=String(receipt?.assetId??receipt?.asset_id??"").toUpperCase();
  const receiptFrom=String(receipt?.from??"");
  const receiver=String(receipt?.to??"");
  let amount=0n;try{amount=BigInt(String(receipt?.value??0))}catch{amount=0n}
  if(kind==="transfer"&&receiptFrom===from&&receiver===RECEIVER&&(!asset||asset==="KLV")&&amount>=min)return{receiver,amount,asset};
 }
 const contracts=raw?.Contract??raw?.contract??tx?.contracts??tx?.contract??tx?.Contract??[];
 if(!Array.isArray(contracts))return null;
 for(const c of contracts){const p=c?.Parameter??c?.parameter??{},type=String(p.type_url??p.typeUrl??c.typeString??c.type_string??c.type??c.contractType??"");
 if(!type.toLowerCase().includes("transfer"))continue;
 let x=null;const decoded=p.value&&typeof p.value==="object"?p.value:(c?.value&&typeof c.value==="object"?c.value:p);
 if(decoded){const amount=BigInt(String(decoded.amount??decoded.Amount??0));const rawReceiver=String(decoded.receiver??decoded.Receiver??decoded.toAddress??decoded.to_address??"");let receiver=rawReceiver;
  if(!ADDR.test(receiver)){const bytes=b64(rawReceiver);if(bytes.length===32)receiver=bech32.encode("klv",bech32.toWords(bytes),120)}
  x=receiver&&amount>0n?{receiver,amount,asset:String(decoded.kda??decoded.KDA??decoded.assetId??decoded.asset_id??"")}:null;
 }else x=transfer(String(p.value??c.value??""));
 if(x&&x.receiver===RECEIVER&&(!x.asset||x.asset.toUpperCase()==="KLV")&&x.amount>=min)return x}
 return null;
}
async function handle(db:Admin,id:string,b:any){
 if(b.op==="status"){const a=await walletFor(db,id);if(a instanceof Response)return a;if(!a)return out({connected:false,active:false});
 const {data,error}=await db.from("memberships").select("expires_at").eq("user_id",id).maybeSingle();if(error)return out({error:"Could not read membership."},503);
 return out({connected:true,walletAddress:a,expiresAt:data?.expires_at||null,active:!!data?.expires_at&&Date.parse(data.expires_at)>Date.now()})}
 if(b.op==="quote"){const a=await walletFor(db,id);if(a instanceof Response)return a;if(!a)return out({error:"Connect your Klever wallet in character selection before paying."},409);
 const p=await ticker();if(!p)return out({error:"Live KLV/USDT price unavailable or stale. Try again shortly."},503);
 const atomic=BigInt(Math.ceil(5/p.price*1e6)),expires=new Date(Date.now()+600000).toISOString();
 const {data,error}=await db.from("membership_quotes").insert({user_id:id,klever_address:a,usd_price:p.price,klv_amount_atomic:atomic.toString(),source_time:p.sourceTime,expires_at:expires}).select("id").single();
 if(error||!data?.id)return out({error:"Could not prepare a membership quote."},503);
 return out({quoteId:data.id,usdPrice:p.price,usdAmount:5,klvAmount:(Number(atomic)/1e6).toFixed(6),expiresAt:expires,sourceTime:p.sourceTime,receiverAddress:RECEIVER})}
 if(b.op==="verify"){const qid=String(b.quoteId||""),hash=String(b.txHash||"").trim().toLowerCase();if(!UUID.test(qid)||!HASH.test(hash))return out({error:"Enter the 64-character transaction hash from Klever."},400);
 const {data:q,error:qe}=await db.from("membership_quotes").select("*").eq("id",qid).eq("user_id",id).maybeSingle();
 if(qe)return out({error:"Could not read payment quote."},503);if(!q||q.used_at||Date.parse(q.created_at)<Date.now()-QUOTE_VERIFY_MS)return out({error:"Quote expired. Request a new one."},410);
 const a=await walletFor(db,id);if(a instanceof Response)return a;if(!a||a!==q.klever_address)return out({error:"Your linked wallet changed. Request a new quote."},409);
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),10000);let chain:any;
 try{const r=await fetch(CHAIN_API+"/v1.0/transaction/"+hash,{signal:ctl.signal});if(!r.ok)return out({error:r.status===404?"Transaction not indexed on Klever mainnet yet.":"Klever could not confirm the transaction."},409);chain=await r.json()}
 catch{return out({error:"Klever mainnet is unavailable. Try again shortly."},503)}finally{clearTimeout(timer)}
 const payment=validTransfer(chain,hash,a,BigInt(q.klv_amount_atomic),q.created_at,q.expires_at);if(!payment)return out({error:"The confirmed transaction does not match the required KLV amount, linked sender and membership receiving address."},400);
 const {data:activated,error}=await db.rpc("activate_membership_service",{p_user_id:id,p_klever_address:a,p_tx_hash:hash,p_receiver_address:RECEIVER,p_amount_atomic:payment.amount.toString(),p_usd_price:q.usd_price,p_quote_id:qid});
 if(error||!activated?.ok)return out({error:error?.message?.toLowerCase().includes("duplicate")?"This transaction was already used.":"Could not activate membership. Contact support with your transaction hash."},503);
 return out({ok:true,expiresAt:activated.expires_at})}
 return out({error:"Unknown membership operation."},400)
}
export default {fetch:withSupabase({auth:["publishable"],cors:{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"}}},async(req,ctx)=>{
 if(req.method!=="POST")return out({error:"Send a POST."},405);let b:any;try{const s=await req.text();if(s.length>12000)return out({error:"Request too large."},413);b=JSON.parse(s)}catch{return out({error:"Invalid request."},400)}
 const u=await userFor(b?.accessToken);if(u instanceof Response)return u;return handle(ctx.supabaseAdmin as unknown as Admin,u.id,b)
})};
