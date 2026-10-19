export type Product = {id:string;name:string;brand:string;size:string;pack:number;rate:number;min:number;container:string;deposit:number};
export type Party = {id:string;name:string;phone:string;kind:'customer'|'supplier';opening:number;limit:number;area?:string;walkin?:boolean};
export type Batch = {id:string;product:string;qty:number;cost:number;expiry:string};
export type Line = {product:string;qty:number;rate:number;cost?:number;batch?:string;expiry?:string;deposit?:number;allocations?:{batch:string;qty:number;cost:number;expiry:string}[]};
export type Entry = {id:string;at:string;type:string;party:string;lines:Line[];amount:number;paid:number;mode:string;note:string;number:string;discount:number;containers?:number;container?:string;ref?:string;void?:boolean;cost?:number};
export type State = {schema:1;products:Product[];parties:Party[];batches:Batch[];entries:Entry[];rates:Record<string,number>;settings:{name:string;address:string;phone:string};applied:string[]};
export type Command = {id:string;type:string;at:string;payload:any};
export const initial = ():State => ({schema:1,products:[],parties:[],batches:[],entries:[],rates:{},settings:{name:'AMG TRADERS',address:'Venkatagiri, Yousufguda, Hyderabad',phone:''},applied:[]});
export const money=(v:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(v/100);
export const stock=(s:State,id:string)=>s.batches.filter(b=>b.product===id).reduce((n,b)=>n+b.qty,0);
export function normalisePhone(value:string){let digits=value.replace(/\D/g,'');if(digits.length===12&&digits.startsWith('91'))digits=digits.slice(2);return /^[6-9]\d{9}$/.test(digits)?digits:''}
export function balance(s:State,id:string){const p=s.parties.find(p=>p.id===id);return (p?.opening||0)+s.entries.filter(e=>e.party===id&&!e.void).reduce((n,e)=>n+(e.type==='sale'||e.type==='purchase'?e.amount-e.paid:e.type==='payment'?-e.amount:e.type==='sale-return'||e.type==='purchase-return'?-e.amount:e.type==='deposit-charge'?e.amount:e.type==='deposit-refund'?-e.amount:0),0)}
export function empties(s:State,party:string,container:string){return s.entries.filter(e=>e.party===party&&e.container===container&&!e.void).reduce((n,e)=>n+(e.type==='container-out'?e.containers||0:e.type==='container-in'?-(e.containers||0):0),0)}
const fail=(s:string):never=>{throw new Error(s)};
function integer(n:any,label:string,min=0){if(!Number.isSafeInteger(n)||n<min||n>1e10)fail('Invalid '+label);return n as number}
function text(v:any,label:string){if(typeof v!=='string'||!v.trim()||v.length>300)fail('Enter '+label);return v.trim()}
export function apply(state:State,c:Command):State{
 if(state.applied.includes(c.id))return state;
 if(!c.id||!c.at||Number.isNaN(Date.parse(c.at)))fail('Invalid transaction');
 const s=structuredClone(state),p=c.payload;
 const party=()=>s.parties.find(x=>x.id===p.party)||fail('Select a customer or supplier');
 const add=(type:string,extra:any={})=>{const e:Entry={id:c.id,at:c.at,type,party:p.party||'',lines:[],amount:0,paid:0,mode:p.mode||'cash',note:p.note||'',discount:0,number:`AMG-${String(s.entries.length+1).padStart(6,'0')}`,...extra};s.entries.push(e);return e};
 if(c.type==='product'){
  const x:Product={id:c.id,name:text(p.name,'product name'),brand:text(p.brand,'brand'),size:text(p.size,'bottle size'),pack:integer(p.pack,'bottles per case',1),rate:integer(p.rate,'selling rate'),min:integer(p.min,'low stock level'),container:p.container?text(p.container,'container type'):'',deposit:integer(p.deposit||0,'deposit')};
  if(s.products.some(y=>`${y.brand}|${y.name}|${y.size}|${y.pack}`.toLowerCase()===`${x.brand}|${x.name}|${x.size}|${x.pack}`.toLowerCase()))fail('This product and pack already exist');
  s.products.push(x);
 }else if(c.type==='party'){
  if(!['customer','supplier'].includes(p.kind))fail('Invalid party type');
  const rawPhone=typeof p.phone==='string'?p.phone.trim():'',phone=rawPhone?normalisePhone(rawPhone):'';
  if(rawPhone&&!phone)fail('Enter a valid 10-digit Indian mobile number');
  if(phone&&s.parties.some(x=>x.kind===p.kind&&normalisePhone(x.phone)===phone))fail('This phone number already belongs to a '+p.kind);
  if(p.walkin&&p.kind!=='customer')fail('Walk-in must be a customer');
  if(p.walkin&&(phone||p.opening||p.limit))fail('Walk-in cannot have a phone, opening due or credit limit');
  if(p.walkin&&s.parties.some(x=>x.walkin))fail('Walk-in customer already exists');
  s.parties.push({id:c.id,name:text(p.name,'name'),phone,kind:p.kind,opening:integer(p.opening||0,'opening due'),limit:integer(p.limit||0,'credit limit'),area:typeof p.area==='string'?p.area.trim().slice(0,100):'',walkin:p.walkin===true});
 }else if(c.type==='settings'){
  s.settings={name:text(p.name,'shop name'),address:text(p.address,'address'),phone:String(p.phone||'').slice(0,30)};
 }else if(c.type==='rate'){
  if(party().kind!=='customer'||!s.products.some(x=>x.id===p.product))fail('Select customer and product');
  s.rates[p.party+'|'+p.product]=integer(p.rate,'rate');
 }else if(c.type==='sale'||c.type==='purchase'){
  const kind=c.type==='sale'?'customer':'supplier';
  if(party().kind!==kind)fail('Select a '+kind);
  if(!Array.isArray(p.lines)||!p.lines.length||p.lines.length>100)fail('Add 1–100 products');
  const seen=new Set<string>(),lines:Line[]=[],containers:Record<string,number>={};let total=0,totalCost=0;
  for(const raw of p.lines){
   const pr=s.products.find(x=>x.id===raw.product)||fail('Product no longer exists');
   if(seen.has(pr.id))fail('Combine repeated product lines');seen.add(pr.id);
   const qty=integer(raw.qty,'whole cases',1),rate=integer(raw.rate,'case rate',1);
   let cost=0;const allocations:NonNullable<Line['allocations']>=[];
   if(c.type==='sale'){
    if(stock(s,pr.id)<qty)fail('Insufficient stock: '+pr.name);
    let left=qty;
    const today=new Date(c.at).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
    for(const b of s.batches.filter(x=>x.product===pr.id&&x.qty>0&&(!x.expiry||x.expiry>=today)).sort((a,b)=>(a.expiry||'9999').localeCompare(b.expiry||'9999'))){const take=Math.min(left,b.qty);b.qty-=take;cost+=take*b.cost;allocations.push({batch:b.id,qty:take,cost:b.cost,expiry:b.expiry});left-=take;if(!left)break}
    if(left)fail('Only expired stock remains for '+pr.name);
   }else{
    const expiry=raw.expiry||'';if(expiry&&(!/^\d{4}-\d{2}-\d{2}$/.test(expiry)||expiry<c.at.slice(0,10)))fail('Purchase expiry must be today or later');
    s.batches.push({id:c.id+'-'+pr.id,product:pr.id,qty,cost:rate,expiry});cost=qty*rate;
   }
   total+=qty*rate;totalCost+=cost;lines.push({product:pr.id,qty,rate,cost,expiry:raw.expiry||'',deposit:pr.deposit,allocations});
   if(pr.container)containers[pr.container]=(containers[pr.container]||0)+qty;
  }
  const discount=integer(p.discount||0,'discount');if(discount>total)fail('Discount exceeds goods total');
  if(c.type==='purchase'&&discount)fail('Enter net purchase case rates; purchase discount must be zero');
  const deposit=lines.reduce((n,l)=>n+l.qty*(l.deposit||0),0);
  const amount=total-discount+deposit,paid=integer(p.paid||0,'payment');if(paid>amount)fail('Payment exceeds bill; record extra as advance separately');
  if(!['cash','upi','bank'].includes(p.mode))fail('Choose payment mode');
  if(c.type==='sale'&&party().walkin&&paid!==amount)fail('Walk-in sales must be fully paid');
  if(c.type==='sale'&&party().limit&&balance(s,p.party)+amount-paid>party().limit)fail('Customer credit limit exceeded');
  add(c.type,{lines,amount,paid,discount,cost:totalCost,note:String(p.note||'').slice(0,300)});
  for(const [container,qty] of Object.entries(containers))add('container-out',{id:c.id+'-'+container,container,containers:qty,ref:c.id});
 }else if(c.type==='payment'){
  party();if(!['cash','upi','bank'].includes(p.mode))fail('Choose payment mode');const amount=integer(p.amount,'amount',1);if(p.direction==='reverse'){if(amount>Math.max(0,-balance(s,p.party)))fail('Refund exceeds existing advance / credit');add('payment',{amount:-amount})}else add('payment',{amount});
 }else if(c.type==='containers'){
  party();const container=text(p.container,'container type'),qty=integer(p.qty,'whole crates',1);
  if(qty>empties(s,p.party,container))fail('Return exceeds pending crates of this type');
  add('container-in',{container,containers:qty});
 }else if(c.type==='deposit-refund'){
  party();const amount=integer(p.amount,'deposit refund',1);
  const held=s.entries.filter(e=>e.party===p.party&&!e.void).reduce((n,e)=>n+((e.type==='sale'||e.type==='purchase')?e.lines.reduce((a,l)=>a+l.qty*(l.deposit||0),0):e.type==='deposit-refund'?-e.amount:0),0);
  if(amount>held)fail('Refund exceeds recorded deposit');
  // A refund creates a credit. Settle it with a normal payment only if cash changes hands.
  add('deposit-refund',{amount,note:text(p.note,'refund reason')});
 }else if(c.type==='damage'){
  const b=s.batches.find(x=>x.id===p.batch)||fail('Select stock batch');const qty=integer(p.qty,'cases',1);if(qty>b.qty)fail('Not enough stock in this batch');b.qty-=qty;add('damage',{lines:[{product:b.product,qty,rate:b.cost,batch:b.id}],amount:qty*b.cost,note:text(p.note,'damage reason')});
 }else if(c.type==='expense'){
  if(!['cash','upi','bank'].includes(p.mode))fail('Choose payment mode');add('expense',{amount:integer(p.amount,'expense',1),note:text(p.note,'expense description')});
 }else if(c.type==='cancel'){
  const e=s.entries.find(e=>e.id===p.ref&&['sale','purchase'].includes(e.type)&&!e.void)||fail('Select an active bill');
  const reason=text(p.note,'cancellation reason');
  if(s.entries.some(x=>x.party===e.party&&x.at>e.at&&!x.void))fail('Later party transactions exist. Use a corrective return instead of cancelling this bill.');
  if(e.type==='sale')for(const l of e.lines)for(const a of l.allocations||[]){const b=s.batches.find(x=>x.id===a.batch);if(!b)fail('Original stock batch missing');b!.qty+=a.qty}
  else for(const l of e.lines){const b=s.batches.find(x=>x.id===e.id+'-'+l.product);if(!b||b.qty!==l.qty)fail('Purchased stock has moved; cannot cancel');b!.qty=0}
  e.void=true;s.entries.filter(x=>x.ref===e.id).forEach(x=>x.void=true);add('cancel',{ref:e.id,note:reason});
 }else if(c.type==='return'){
  const e=s.entries.find(e=>e.id===p.ref&&['sale','purchase'].includes(e.type)&&!e.void)||fail('Select original bill');
  const original=e.lines.find(l=>l.product===p.product)||fail('Product not on bill');const qty=integer(p.qty,'return cases',1);
  const prior=s.entries.filter(x=>x.ref===e.id&&!x.void&&x.type.endsWith('-return')).flatMap(x=>x.lines).filter(l=>l.product===p.product).reduce((n,l)=>n+l.qty,0);
  if(qty+prior>original.qty)fail('Return exceeds original quantity');
  const pr=s.products.find(x=>x.id===p.product)!;
  if(pr.container)fail('For returnable glass, cancel an untouched bill or record empties separately. Goods returns for glass need supplier reconciliation.');
  let returnCost=0;
  if(e.type==='sale'){let skip=prior,left=qty;for(const a of original.allocations||[]){const offset=Math.min(skip,a.qty);skip-=offset;const take=Math.min(left,a.qty-offset);if(take){s.batches.push({id:c.id+'-'+a.batch,product:p.product,qty:take,cost:a.cost,expiry:a.expiry});returnCost+=take*a.cost;left-=take}if(!left)break}if(left)fail('Original batch allocation unavailable')}
  else{let left=qty;for(const b of s.batches.filter(x=>x.product===p.product&&x.id===e.id+'-'+p.product)){const take=Math.min(left,b.qty);b.qty-=take;left-=take}if(left)fail('Original purchase batch has insufficient stock')}
  const factor=1-e.discount/e.lines.reduce((n,l)=>n+l.qty*l.rate,0); const amount=Math.round((prior+qty)*original.rate*factor)-Math.round(prior*original.rate*factor);
  add(e.type+'-return',{party:e.party,ref:e.id,lines:[{product:p.product,qty,rate:original.rate,cost:returnCost}],amount,note:text(p.note,'return reason')});
 }else fail('Unknown action');
 s.applied.push(c.id);return s;
}


