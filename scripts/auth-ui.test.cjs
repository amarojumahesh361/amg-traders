const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const {createRequire}=require('node:module');
const req=createRequire(require('node:path').resolve('package.json'));
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'https://amg-test.invalid/'}),w=dom.window;
for(const key of ['window','document','navigator','HTMLElement','HTMLInputElement','Event','MouseEvent','sessionStorage','location'])Object.defineProperty(global,key,{value:w[key],configurable:true});
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=req('react'),{createRoot}=req('react-dom/client'),{act}=React;
const ADMIN_EMAIL='amarojumahesh361@gmail.com',adminSession={user:{email:ADMIN_EMAIL,email_confirmed_at:'2026-10-31T00:00:00Z'}};
let listener,session=null,invalidOtp=false,updateCalls=0,loginCalls=0,resetCalls=0,businessMounts=0;
const client={auth:{
 getSession:async()=>({data:{session},error:null}),
 onAuthStateChange:fn=>{listener=fn;return{data:{subscription:{unsubscribe(){}}}}},
 signInWithPassword:async()=>{loginCalls++;return{data:{session:null},error:{code:'invalid_credentials',message:'Invalid credentials'}}},
 resetPasswordForEmail:async(email)=>{assert.equal(email,ADMIN_EMAIL);resetCalls++;return{error:null}},
 verifyOtp:async data=>{assert.equal(data.type,'recovery');assert.equal(data.email,ADMIN_EMAIL);if(invalidOtp)return{data:{session:null},error:{message:'Expired'}};session=adminSession;listener('PASSWORD_RECOVERY',session);return{data:{session},error:null}},
 updateUser:async()=>{updateCalls++;listener('USER_UPDATED',adminSession);return{error:null}},
 signOut:async()=>{session=null;listener('SIGNED_OUT',null);return{error:null}}
}};
const ts=req('typescript'),source=ts.transpileModule(fs.readFileSync('src/AuthGate.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleObject={exports:{}};
vm.runInThisContext('(function(require,module,exports){'+source+'\n})')(id=>id==='./auth'?{ADMIN_EMAIL,supabase:client,signOut:()=>{throw Error('Business-cache-clearing logout must not run during recovery')}}:id==='./App'?{default:()=>{businessMounts++;return React.createElement('div',null,'Private business')}}:req(id),moduleObject,moduleObject.exports);
const Component=moduleObject.exports.default,root=createRoot(w.document.getElementById('root'));
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
async function render(){await act(async()=>{root.render(React.createElement(Component));await flush()})}
async function click(text){const button=[...w.document.querySelectorAll('button')].find(el=>el.textContent.includes(text));assert.ok(button,'Missing button '+text);await act(async()=>{button.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));await flush()})}
async function fill(selector,value){const input=w.document.querySelector(selector);assert.ok(input,'Missing input '+selector);await act(async()=>{Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new w.Event('input',{bubbles:true}));await flush()})}
async function submit(label){const form=w.document.querySelector('form[aria-label="'+label+'"]');assert.ok(form,'Missing form '+label);await act(async()=>{form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await flush()})}
async function main(){
 await render();assert.ok(w.document.querySelector('input[autocomplete="current-password"]'));
 await fill('input[autocomplete="current-password"]','Synthetic test password');await submit('Email and password sign in');assert.equal(loginCalls,1);assert.match(w.document.body.textContent,/incorrect/);assert.equal(businessMounts,0);
 await click('Forgot password');await submit('Request password reset code');assert.equal(resetCalls,1);assert.ok(w.document.querySelector('input[autocomplete="one-time-code"]'));
 invalidOtp=true;await fill('input[autocomplete="one-time-code"]','123456');await submit('Verify password reset code');assert.equal(updateCalls,0);assert.match(w.document.body.textContent,/invalid or expired/);assert.equal(businessMounts,0);
 invalidOtp=false;await fill('input[autocomplete="one-time-code"]','654321');await submit('Verify password reset code');assert.ok(w.document.querySelector('form[aria-label="Set new password"]'));assert.equal(businessMounts,0,'recovery must not open the business');
 await fill('input[autocomplete="new-password"]','Synthetic secret 123');await fill('label:nth-of-type(2) input','Different secret 123');await submit('Set new password');assert.equal(updateCalls,0);assert.match(w.document.body.textContent,/do not match/);
 await fill('label:nth-of-type(2) input','Synthetic secret 123');await submit('Set new password');assert.equal(updateCalls,1);assert.equal(businessMounts,0);assert.equal(sessionStorage.getItem('amg-password-recovery'),null);assert.ok(w.document.querySelector('input[autocomplete="current-password"]'));
 await act(async()=>root.unmount());sessionStorage.setItem('amg-password-recovery','password');session=adminSession;const anotherRoot=createRoot(w.document.getElementById('root'));await act(async()=>{anotherRoot.render(React.createElement(Component));await flush()});assert.ok(w.document.querySelector('form[aria-label="Set new password"]'));assert.equal(businessMounts,0,'reload in recovery must not open business');await act(async()=>anotherRoot.unmount());
 console.log('PASS: password login UI; invalid credentials; recovery request; invalid OTP; verified recovery gate; password mismatch; password update; reset signout preserves cache; recovery reload gate.');
 w.close();
}
main().catch(error=>{console.error(error);w.close();process.exit(1)});
