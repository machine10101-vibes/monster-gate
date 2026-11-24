import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { bech32 } from "bech32";
const RECEIVER="klv1mhrz0thhdsu4rznyfa27c9jr8hwtnf9f4sf8ef2kajgkup4sdhyqfs0wtv";
const SWOPUS_API="https://api4.swopus.com";
const KLV_ASSET="KLV";
const USDT_ASSET="USDT-23V8";
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
function epochMillis(value:any):number|null{
 if(value===null||value===undefined||value==="")return null;
 const text=String(value);
 if(/^\d+(?:\.\d+)?$/.test(text)){const n=Number(text);return Number.isFinite(n)?(n<1e12?n*1000:n):null}
 const parsed=Date.parse(text);return Number.isFinite(parsed)?parsed:null;
}
function collection(value:any):any[]{
 const root=value?.data??value;
 if(Array.isArray(root))return root;
 for(const key of ["pools","items","results","reserves"])if(Array.isArray(root?.[key]))return root[key];
 return [];
}
function assetId(value:any):string{
 if(typeof value==="string")return value;
 return String(value?.asset_id??value?.assetId??value?.id??value?.ticker??value?.symbol??"");
}
function numericField(value:any,...keys:string[]):number|null{
 for(const key of keys){
  const n=Number(value?.[key]);
  if(Number.isFinite(n)&&n>0)return n;
 }
 return null;
}
function poolPrice(pool:any,reserve:any):number|null{
 const base=assetId(pool?.base_asset_id??pool?.baseAssetId??pool?.token0??pool?.base_token);
 const quote=assetId(pool?.quote_asset_id??pool?.quoteAssetId??pool?.token1??pool?.quote_token);
 const baseIsKlv=base===KLV_ASSET&&quote===USDT_ASSET;
 const reverse=base===USDT_ASSET&&quote===KLV_ASSET;
 if(!baseIsKlv&&!reverse)return null;
 if(pool?.deprecated===true||pool?.stale===true||reserve?.stale===true)return null;
 const lag=Number(reserve?.indexer_lag_blocks??pool?.indexer_lag_blocks??0);
 if(Number.isFinite(lag)&&lag>20)return null;
 const r0=numericField(reserve,"reserve0","reserve_0","reserve0_scaled")??numericField(pool,"reserve0","reserve_0","reserve0_scaled");
 const r1=numericField(reserve,"reserve1","reserve_1","reserve1_scaled")??numericField(pool,"reserve1","reserve_1","reserve1_scaled");
 let ratio:number|null=null;
 if(r0&&r1)ratio=r1/r0;
 else{
  const raw0=numericField(reserve,"reserve0_raw","reserve_0_raw")??numericField(pool,"reserve0_raw","reserve_0_raw");
  const raw1=numericField(reserve,"reserve1_raw","reserve_1_raw")??numericField(pool,"reserve1_raw","reserve_1_raw");
  const d0=Number(pool?.base_decimals??pool?.token0_decimals??pool?.token0?.decimals??6);
  const d1=Number(pool?.quote_decimals??pool?.token1_decimals??pool?.token1?.decimals??6);
  if(raw0&&raw1&&Number.isInteger(d0)&&Number.isInteger(d1)){
   const scaled0=raw0/10**d0,scaled1=raw1/10**d1;
   ratio=scaled1/scaled0;
  }
 }
 if(!Number.isFinite(ratio)||!ratio||ratio<=0)return null;
 const price=baseIsKlv?ratio:1/ratio;
 return Number.isFinite(price)&&price>0?price:null;
}
async function ticker(){
 if(priceCache&&Date.now()-priceCache.at<10000)return priceCache;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetch(SWOPUS_API+"/api/public/pools",{
   signal:controller.signal,headers:{accept:"application/json","cache-control":"no-cache"},
  });
  if(!response.ok)throw new Error("Swopus pool market data is unavailable.");
  const payload=await response.json();
  const pools=collection(payload);
  const pool=pools.find((item:any)=>{
   const a=assetId(item?.base_asset_id??item?.baseAssetId??item?.token0??item?.base_token);
   const b=assetId(item?.quote_asset_id??item?.quoteAssetId??item?.token1??item?.quote_token);
   return(a===KLV_ASSET&&b===USDT_ASSET)||(a===USDT_ASSET&&b===KLV_ASSET);
  });
  if(!pool)throw new Error("Swopus does not currently list a KLV/USDT pool.");
  const pairId=pool?.pair_id??pool?.pairId??pool?.id;
  if(pairId===undefined||pairId===null)throw new Error("Swopus KLV/USDT pool identifier is missing.");
  const reservesController=new AbortController(),reservesTimer=setTimeout(()=>reservesController.abort(),10000);
  try{
   const reservesResponse=await fetch(SWOPUS_API+"/api/pools/reserves?pair_ids="+encodeURIComponent(String(pairId)),{
    signal:reservesController.signal,headers:{accept:"application/json","cache-control":"no-cache"},
   });
   if(!reservesResponse.ok)throw new Error("Swopus live KLV/USDT reserves are unavailable.");
   const reservesPayload=await reservesResponse.json();
   const reserveRows=collection(reservesPayload);
   const reserve=reserveRows.find((item:any)=>String(item?.pair_id??item?.pairId??item?.id)===String(pairId))??reserveRows[0];
   if(!reserve)throw new Error("Swopus has not returned live KLV/USDT reserves.");
   const price=poolPrice(pool,reserve);
   if(!price)throw new Error("Swopus KLV/USDT pool data is stale or incomplete.");
   const sourceTime=new Date().toISOString();
   return priceCache={price,sourceTime,source:"Swopus",pairId:String(pairId),at:Date.now()};
  }finally{clearTimeout(reservesTimer)}
 }catch(error){
  console.error("Swopus KLV/USDT quote failed:",error);
  return null;
 }finally{clearTimeout(timer)}
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
 if(reportedHash!==hash.toLowerCase())return null;
 if(String(tx?.chainID??tx?.chainId??"")!=="108")return null;
 const status=String(j?.data?.status??j?.status??tx?.status??tx?.receipt?.status??"").toLowerCase();
 if(!["success","onchain","on-chain","confirmed"].includes(status))return null;
 const stamp=tx?.timestamp??tx?.block?.timestamp??tx?.blockTimestamp??tx?.createdAt??j?.data?.timestamp;
 const numeric=typeof stamp==="number"||/^\d+(?:\.\d+)?$/.test(String(stamp??""))?Number(stamp):Date.parse(String(stamp??""));
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

function transactionRows(j:any):any[]{
 const root=j?.data??j;
 if(Array.isArray(root))return root;
 for(const key of ["transactions","list","items","results","transactionList","transaction_list"]){
  if(Array.isArray(root?.[key]))return root[key];
 }
 if(Array.isArray(j?.transactions))return j.transactions;
 if(root?.transaction&&typeof root.transaction==="object")return[root.transaction];
 return [];
}
async function recentIncoming(q:any):Promise<any[]|Response>{
 const params=new URLSearchParams({
  receiver:RECEIVER,toAddress:RECEIVER,asset:"KLV",type:"0",limit:"100",
  startTime:String(Math.floor(Date.parse(q.created_at)/1000)),
 });
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),10000);
 try{
  const r=await fetch(CHAIN_API+"/v1.0/transaction/list?"+params.toString(),{
   signal:ctl.signal,headers:{accept:"application/json","cache-control":"no-cache"},
  });
  if(r.status===204)return[];
  if(!r.ok)return out({error:"KleverScan transaction feed is temporarily unavailable."},503);
  const j=await r.json();
  if(j?.error&&j?.code!=="successful")return out({error:"KleverScan could not list recent transactions."},503);
  return transactionRows(j);
 }catch{
  return out({error:"KleverScan transaction feed is temporarily unavailable. We’ll retry shortly."},503);
 }finally{clearTimeout(timer)}
}
async function transactionByHash(hash:string):Promise<any|null>{
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),8000);
 try{
  const r=await fetch(CHAIN_API+"/v1.0/transaction/"+hash,{signal:ctl.signal,headers:{accept:"application/json","cache-control":"no-cache"}});
  if(!r.ok)return null;
  return await r.json();
 }catch{return null}finally{clearTimeout(timer)}
}
async function activatePayment(db:Admin,id:string,q:any,a:string,hash:string,payment:any):Promise<Response>{
 const {data:activated,error}=await db.rpc("activate_membership_service",{
  p_user_id:id,p_klever_address:a,p_tx_hash:hash,p_receiver_address:RECEIVER,
  p_amount_atomic:payment.amount.toString(),p_usd_price:q.usd_price,p_quote_id:q.id,
 });
 if(error||!activated?.ok){
  const message=String(error?.message||"").toLowerCase();
  return out({error:message.includes("duplicate")?"This transaction was already used.":"Could not activate membership. Please retry or contact support."},503);
 }
 return out({ok:true,expiresAt:activated.expires_at,txHash:hash});
}
async function watchPayment(db:Admin,id:string,quoteId:string):Promise<Response>{
 if(!UUID.test(quoteId))return out({error:"Refresh your Gate Pass quote to continue."},400);
 const {data:q,error:qe}=await db.from("membership_quotes").select("*").eq("id",quoteId).eq("user_id",id).maybeSingle();
 if(qe)return out({error:"Could not read your membership quote."},503);
 if(!q)return out({error:"This quote could not be found. Refresh your quote."},404);
 if(q.used_at){
  const {data:membership}=await db.from("memberships").select("expires_at").eq("user_id",id).maybeSingle();
  if(membership?.expires_at&&Date.parse(membership.expires_at)>Date.now())return out({ok:true,expiresAt:membership.expires_at});
  return out({error:"This quote has already been used. Refresh your quote."},409);
 }
 const cutoff=new Date(Date.now()-7*24*60*60*1000).toISOString();
 if(Date.parse(q.created_at)<Date.parse(cutoff))return out({error:"Your quote has expired. Refresh it to continue."},410);
 const a=await walletFor(db,id);
 if(a instanceof Response)return a;
 if(!a||a!==q.klever_address)return out({error:"Your linked Klever wallet changed. Refresh your quote."},409);
 // Include every recent unused quote for this account/wallet. If the player closes
 // checkout after sending, a later checkout can still find the original payment.
 const {data:pendingQuotes,error:pendingError}=await db.from("membership_quotes")
  .select("*").eq("user_id",id).eq("klever_address",a).is("used_at",null)
  .gte("created_at",cutoff).order("created_at",{ascending:true}).limit(100);
 if(pendingError)return out({error:"Could not load pending membership quotes."},503);
 const quotes=(pendingQuotes||[]).filter((item:any)=>item?.id&&Date.parse(item.created_at)>=Date.parse(cutoff));
 if(!quotes.some((item:any)=>item.id===q.id))quotes.unshift(q);
 const rows=await recentIncoming(quotes[0]||q);
 if(rows instanceof Response)return rows;
 let examined=0;
 for(const row of rows){
  const tx=transaction(row);
  const hash=String(tx?.hash??row?.hash??tx?.txHash??row?.txHash??"").trim().toLowerCase();
  if(!HASH.test(hash))continue;
  const stamp=epochMillis(tx?.timestamp??tx?.block?.timestamp??tx?.blockTimestamp??tx?.createdAt);
  if(stamp&&stamp<Date.parse(cutoff))continue;
  const sender=String(tx?.sender??tx?.from??tx?.senderAddress??"");
  if(sender&&sender!==a)continue;
  const state=String(tx?.status??row?.status??"").toLowerCase();
  if(state&& !["success","onchain","on-chain","confirmed"].includes(state))continue;
  examined+=1;
  let detail=row,matchedQuote:any=null,payment:any=null;
  for(const candidate of quotes){
   payment=validTransfer(detail,hash,a,BigInt(candidate.klv_amount_atomic),candidate.created_at,candidate.expires_at);
   if(payment){matchedQuote=candidate;break}
  }
  if(!payment){
   detail=await transactionByHash(hash);
   if(!detail)continue;
   for(const candidate of quotes){
    payment=validTransfer(detail,hash,a,BigInt(candidate.klv_amount_atomic),candidate.created_at,candidate.expires_at);
    if(payment){matchedQuote=candidate;break}
   }
  }
  if(payment&&matchedQuote)return activatePayment(db,id,matchedQuote,a,hash,payment);
  if(examined>=20)break;
 }
 return out({ok:false,found:false,checkedAt:new Date().toISOString()});
}

async function handle(db:Admin,id:string,b:any){
 if(b.op==="status"){const a=await walletFor(db,id);if(a instanceof Response)return a;if(!a)return out({connected:false,active:false});
 const {data,error}=await db.from("memberships").select("expires_at").eq("user_id",id).maybeSingle();if(error)return out({error:"Could not read membership."},503);
 return out({connected:true,walletAddress:a,expiresAt:data?.expires_at||null,active:!!data?.expires_at&&Date.parse(data.expires_at)>Date.now()})}
 if(b.op==="watch")return watchPayment(db,id,String(b.quoteId||""));
 if(b.op==="quote"){const a=await walletFor(db,id);if(a instanceof Response)return a;if(!a)return out({error:"Connect your Klever wallet in character selection before paying."},409);
 const p=await ticker();if(!p)return out({error:"Bitcoin.me live KLV/USDT price feed is temporarily unavailable. Please refresh your quote."},503);
 const atomic=BigInt(Math.ceil(5/p.price*1e6)),expires=new Date(Date.now()+600000).toISOString();
 const {data,error}=await db.from("membership_quotes").insert({user_id:id,klever_address:a,usd_price:p.price,klv_amount_atomic:atomic.toString(),source_time:p.sourceTime,expires_at:expires}).select("id").single();
 if(error||!data?.id)return out({error:"Could not prepare a membership quote."},503);
 return out({quoteId:data.id,usdPrice:p.price,usdAmount:5,klvAmount:(Number(atomic)/1e6).toFixed(6),expiresAt:expires,sourceTime:p.sourceTime,priceSource:p.source,receiverAddress:RECEIVER})}
 if(b.op==="verify"){const qid=String(b.quoteId||""),hash=String(b.txHash||"").trim().toLowerCase();if(!UUID.test(qid)||!HASH.test(hash))return out({error:"Enter the 64-character transaction hash from Klever."},400);
 const {data:q,error:qe}=await db.from("membership_quotes").select("*").eq("id",qid).eq("user_id",id).maybeSingle();
 if(qe)return out({error:"Could not read payment quote."},503);if(!q||q.used_at||Date.parse(q.created_at)<Date.now()-7*24*60*60*1000)return out({error:"Quote expired. Request a new one."},410);
 const a=await walletFor(db,id);if(a instanceof Response)return a;if(!a||a!==q.klever_address)return out({error:"Your linked wallet changed. Request a new quote."},409);
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),10000);let chain:any;
 try{const r=await fetch(CHAIN_API+"/v1.0/transaction/"+hash,{signal:ctl.signal});if(!r.ok)return out({error:r.status===404?"Transaction not indexed on Klever mainnet yet.":"Klever could not confirm the transaction."},409);chain=await r.json()}
 catch{return out({error:"Klever mainnet is unavailable. Try again shortly."},503)}finally{clearTimeout(timer)}
 const payment=validTransfer(chain,hash,a,BigInt(q.klv_amount_atomic),q.created_at,q.expires_at);if(!payment)return out({error:"The confirmed transaction does not match the required KLV amount, linked sender and membership receiving address."},400);
 return activatePayment(db,id,q,a,hash,payment)}
 return out({error:"Unknown membership operation."},400)
}
export default {fetch:withSupabase({auth:["publishable"],cors:{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"}}},async(req,ctx)=>{
 if(req.method!=="POST")return out({error:"Send a POST."},405);let b:any;try{const s=await req.text();if(s.length>12000)return out({error:"Request too large."},413);b=JSON.parse(s)}catch{return out({error:"Invalid request."},400)}
 const u=await userFor(b?.accessToken);if(u instanceof Response)return u;return handle(ctx.supabaseAdmin as unknown as Admin,u.id,b)
})};
