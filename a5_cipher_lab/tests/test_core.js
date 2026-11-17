"use strict";
const assert = require("node:assert/strict");
const core = require("../web/cipher-core.js");
const key = core.bytesToBinary(core.hexToBytes("1223456789ABCDEF"));
function packedHex(bits){return core.bytesToHex(core.binaryToBytes(bits.padEnd(Math.ceil(bits.length/8)*8,"0")));}
// TinyA5/1 khớp Python 23 bit trong dự án.
let r = core.run("tiny","1011","10101110010110110100101");
assert.equal(r.s,"0110");assert.equal(r.c,"1101");assert.equal(r.recovered,r.p);
// Vector kiểm thử độc lập (Briceno–Goldberg–Wagner), 114 bit mỗi hướng.
r=core.run("a5","0".repeat(114),key,0x134,"a2b");
assert.equal(packedHex(r.s),"534eaa582fe8151ab6e1855a728c00");
r=core.run("a5","0".repeat(114),key,0x134,"b2a");
assert.equal(packedHex(r.s),"24fd35a35d5fb6526d32f906df1ac0");
// Nhiều frame, bản rõ không chỉ 4 bit.
let p="10101011".repeat(1024);
r=core.run("a5",p,key,0x134,"a2b");
assert.equal(r.s.length,p.length);assert.equal(r.recovered,p);assert.equal(r.framesUsed,Math.ceil(p.length/114));
const text="Xin chào từ A5/1 — thử nghiệm UTF-8!";
const bytes=new TextEncoder().encode(text);
r=core.run("a5",core.bytesToBinary(bytes),key,0x134,"a2b");
assert.equal(new TextDecoder().decode(core.binaryToBytes(r.recovered)),text);
// Thử ảnh/tệp giả lập 8192 byte không văn bản.
const fake=new Uint8Array(8192);
for(let i=0;i<fake.length;i++)fake[i]=(i*113)%256;
r=core.run("tiny",core.bytesToBinary(fake),"10101110010110110100101");
assert.deepEqual(core.binaryToBytes(r.recovered),fake);
assert.throws(()=>core.run("tiny","1011","0".repeat(20)), /23/);
assert.throws(()=>core.run("a5","1011",key,1<<22), /frame/i);
console.log("PASS: TinyA5/1 23-bit, A5/1 A→B/B→A reference vectors, multi-frame, UTF-8, binary file, invalid inputs");
