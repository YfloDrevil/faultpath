import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {advance,fresh} from '../src/engine.js';
const f=JSON.parse(readFileSync(new URL('../data/fire-pump.json',import.meta.url)));
test('all branches resolve and every node is reachable',()=>{const seen=new Set();function visit(id){assert.ok(f.nodes[id]);if(seen.has(id))return;seen.add(id);const n=f.nodes[id];assert.equal(n.terminal,n.choices.length===0);for(const c of n.choices)visit(c.next);}visit(f.start);assert.equal(seen.size,Object.keys(f.nodes).length);});
test('safety confirmation gates transitions',()=>assert.throws(()=>advance(f,fresh(f),0)));
test('confirmed starter repair reaches handback only through acceptance',()=>{let s={...fresh(f),confirmed:true};for(const i of [0,0,0,0,0,0,0])s=advance(f,s,i);assert.equal(s.node,'complete');assert.equal(s.history.length,7);assert.throws(()=>advance(f,s,0));});
test('failed tests cannot progress to starter confirmation',()=>{let s={...fresh(f),confirmed:true};s=advance(f,s,0);s=advance(f,s,1);assert.equal(s.node,'batteryFix');assert.throws(()=>advance(f,s,0));});
test('incomplete acceptance is pending, not complete',()=>{let s={...fresh(f),confirmed:true,node:'repair'};assert.equal(advance(f,s,1).node,'pending');});
test('cache lists every runtime dependency',()=>{const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');for(const path of ['src/app.js','src/engine.js','src/style.css','data/fire-pump.json'])assert.ok(sw.includes(path));});
