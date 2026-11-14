import {advance,fresh} from './engine.js';
const app=document.querySelector('#app'), status=document.querySelector('#status');
const key='faultpath:FP-FIRE-001:v1'; let flow,session,storageOK=true;
function el(tag,text){const e=document.createElement(tag);if(text)e.textContent=text;return e;}
function save(){try {localStorage.setItem(key,JSON.stringify({...session,confirmed:false}));}catch{storageOK=false;status.textContent='Storage unavailable: export before closing.';}}
function button(label,action){const b=el('button',label);b.onclick=action;return b;}
function render(){app.replaceChildren();
 if(!session.confirmed && session.node!=='stop') {
 app.append(el('h1','Confirm safety before continuing'),el('p',flow.scope));
 const checks=flow.safety.map(text=>{const label=el('label');const c=el('input');c.type='checkbox';label.append(c,document.createTextNode(text));app.append(label);return c;});
 const go=button('Confirm all and continue',()=>{session.confirmed=true;save();render();});go.disabled=true;
 checks.forEach(c=>c.onchange=()=>go.disabled=!checks.every(x=>x.checked));app.append(go);return;}
 const n=flow.nodes[session.node];app.append(el('h1',n.title),el('p',n.instruction));
 app.append(el('label','Field observations / measurements / OEM source (never prefilled)'));
 const notes=el('textarea');notes.setAttribute('aria-label','Field observations');notes.value=session.notes[session.node]||'';
 notes.oninput=()=>{session.notes[session.node]=notes.value;save();};app.append(notes);
 n.choices.forEach((c,i)=>app.append(button(c.label,()=>{if(!notes.value.trim()){notes.focus();status.textContent='Record your observation and test/source before choosing an outcome.';return;} session=advance(flow,session,i);save();render();})));
 const d=el('details');d.append(el('summary','Evidence, generic values and unknowns'));
 flow.sources.forEach(s=>d.append(el('p',s.id+': '+s.text+(s.url?' '+s.url:''))));d.append(el('p','Unknown: '+flow.unknowns.join('; ')));app.append(d);
}
document.querySelector('#stop').onclick=()=>{if(!session)return;session.history.push({node:session.node,choice:'Global STOP',at:new Date().toISOString()});session.node='stop';session.confirmed=false;save();render();};
document.querySelector('#reset').onclick=()=>{if(flow&&confirm('Start a new case? Export first to keep the current record.')){session=fresh(flow);save();render();}};
document.querySelector('#export').onclick=()=>{if(!session)return;const u=URL.createObjectURL(new Blob([JSON.stringify({...session,confirmed:false,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'}));const a=el('a');a.href=u;a.download='faultpath-case.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
try {const r=await fetch('./data/fire-pump.json');if(!r.ok)throw Error('Flow unavailable');flow=await r.json();session=fresh(flow);
 try {const old=JSON.parse(localStorage.getItem(key));if(old&&old.flowId===flow.id&&old.revision===flow.revision&&flow.nodes[old.node]&&old.notes&&Array.isArray(old.history))session={...old,confirmed:false};}catch{}
 render(); status.textContent='Flow loaded. Preparing offline cache…';
 if('serviceWorker' in navigator){await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;
 const check=()=>navigator.serviceWorker.controller?.postMessage('STATUS');
 navigator.serviceWorker.addEventListener('message',e=>{if(e.data==='OFFLINE_READY'&&storageOK)status.textContent='Offline pack ready · records saved on this device';});navigator.serviceWorker.addEventListener('controllerchange',check);check();
 }else status.textContent='Offline cache unsupported here. Use HTTPS in Safari or Chrome.';
}catch(e){status.textContent='Cannot load diagnostic pack. Reconnect and reload; do not diagnose from a partial pack.';}
