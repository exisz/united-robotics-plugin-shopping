import {createHash} from 'node:crypto';
import {productSchema,pointSchema,slotSchema,campaignSchema,configSchema} from './schema.ts';
const endpoint='https://shopping-service-dusky.vercel.app/api/admin/';
export const revision=v=>createHash('sha256').update(JSON.stringify(v??null)).digest('hex');
const types={product:['products',productSchema],point:['points',pointSchema],slot:['slots',slotSchema],campaign:['campaigns',campaignSchema],config:['config',configSchema]};
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(v);
export async function dispatch(method,params={},env=process.env,request=fetch){
 if(!object(params)||!['shopping.catalog','shopping.orders','shopping.save','shopping.fulfill','shopping.refund','shopping.settle','shopping.audit'].includes(method))throw Error('请求无效');
 const token=env.SHOP_ADMIN_TOKEN;if(!token)throw Error('请在 Capital 的 Connector secrets 配置商城管理密钥');
 async function call(path,data){let r;try{r=await request(endpoint+path,{method:data===undefined?'GET':'POST',headers:{authorization:`Bearer ${token}`,...(data===undefined?{}:{'content-type':'application/json'})},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(18000),redirect:'error'});}catch{throw Error('商城服务暂时无法连接，请稍后刷新确认结果');}
 const text=await r.text();if(text.length>2_000_000||text.includes(token))throw Error('服务返回异常');let v;try{v=JSON.parse(text);}catch{throw Error('服务返回异常');}if(!r.ok)throw Error(r.status===401?'管理密钥无效':typeof v.message==='string'?v.message.slice(0,250):'操作失败，请刷新后重试');return v;}
 const catalog=async()=>{const c=await call('catalog');if(!object(c)||!['products','campaigns','points','slots'].every(k=>Array.isArray(c[k]))||!object(c.config))throw Error('商品目录格式异常');return c;};
 if(method==='shopping.catalog'){const c=await catalog();return {data:c,revisions:Object.fromEntries(Object.entries(types).map(([k,[list]])=>[k,k==='config'?revision(c.config):Object.fromEntries(c[list].map(v=>[v.id,revision(v)]))]))};}
 if(method==='shopping.orders'){if(params.status!==undefined&&(typeof params.status!=='string'||params.status.length>40)||params.campaignId!==undefined&&!id(params.campaignId))throw Error('订单筛选无效');const v=await call('orders',{...(params.status?{status:params.status}:{}),...(params.campaignId?{campaignId:params.campaignId}:{}),limit:1000});if(!Array.isArray(v)||v.some(o=>!id(o.id)||!Number.isInteger(o.total)||!Array.isArray(o.items)))throw Error('订单格式异常');return v;}
 if(method==='shopping.audit'){const v=await call('audit');if(!Array.isArray(v))throw Error('操作记录格式异常');return v;}
 if(method==='shopping.save'){if(!Object.hasOwn(types,params.type))throw Error('管理类型无效');const [list,schema]=types[params.type];const parsed=schema.safeParse(params.data);if(!parsed.success)throw Error('请检查表单：'+parsed.error.issues.map(i=>`${i.path.join('.')} ${i.message}`).join('；').slice(0,220));const c=await catalog(),old=params.type==='config'?c.config:c[list].find(v=>v.id===parsed.data.id);if(params.revision!==revision(old))throw Error('数据已被其他操作更新，请重新读取后再保存');await call(params.type,parsed.data);const fresh=await catalog(),saved=params.type==='config'?fresh.config:fresh[list].find(v=>v.id===parsed.data.id);if(!saved)throw Error('保存后未读到记录，请刷新确认');return {data:saved,revision:revision(saved)};}
 if(!id(params.id))throw Error('订单或期次编号无效');
 if(method==='shopping.fulfill'){if(!['preparing','dispatched','ready','completed'].includes(params.status)||typeof(params.tracking??'')!=='string'||(params.tracking??'').length>200)throw Error('发货信息无效');return call('fulfill',{id:params.id,status:params.status,...(params.tracking?{tracking:params.tracking}:{})});}
 if(method==='shopping.refund'){if(params.confirm!==true)throw Error('请确认全额退款');return call('refund',{id:params.id});}
 if(method==='shopping.settle'){if(params.confirm!==true)throw Error('请确认结团');return call('settle',{id:params.id});}
}
