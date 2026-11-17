/*
 * CipherCore - mô phỏng giáo dục TinyA5/1 (6-8-9) và A5/1 GSM.
 * Không dùng các thuật toán này để bảo vệ dữ liệu thực tế.
 * File độc lập với giao diện, có thể test bằng Node.js.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CipherCore = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const MAX_TRACE = 16;
  const TINY = {
    lengths: [6, 8, 9], control: [1, 3, 3],
    taps: [[2, 4, 5], [6, 7], [2, 7, 8]], output: [5, 7, 8]
  };
  const A5 = {
    lengths: [19, 22, 23], control: [8, 10, 10],
    taps: [[13, 16, 17, 18], [20, 21], [7, 20, 21, 22]],
    output: [18, 21, 22]
  };

  function majority(a, b, c) { return a + b + c >= 2 ? 1 : 0; }
  function xorBits(p, s) {
    let out = "";
    for (let i = 0; i < p.length; i++) out += String(Number(p[i]) ^ Number(s[i]));
    return out;
  }
  function binaryToBytes(bits) {
    if (bits.length % 8) throw Error("Dãy bit phải chia hết cho 8 để chuyển thành byte.");
    const bytes = new Uint8Array(bits.length / 8);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
    return bytes;
  }
  function bytesToBinary(bytes) {
    // Dùng các nhóm 8192 byte để tránh tràn stack / quá nhiều thao tác nối từng bit.
    const parts = [];
    for (const b of bytes) parts.push(b.toString(2).padStart(8, "0"));
    return parts.join("");
  }
  function bytesToHex(bytes, max = bytes.length) {
    return Array.from(bytes.slice(0, max), b => b.toString(16).padStart(2, "0")).join("");
  }
  function hexToBytes(hex) {
    if (!/^(?:[0-9a-f]{2})*$/i.test(hex)) throw Error("HEX phải chứa các cặp ký tự hợp lệ.");
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return out;
  }
  function stateView(regs, lengths) {
    return regs.map((r, i) => r.toString(2).padStart(lengths[i], "0"));
  }

  function runTiny(p, k) {
    if (!/^[01]{23}$/.test(k)) throw Error("TinyA5/1 yêu cầu K gồm đúng 23 bit (6 + 8 + 9).");
    const {lengths, control, taps, output} = TINY;
    const regs = [k.slice(0, 6), k.slice(6, 14), k.slice(14, 23)];
    const initial = [...regs], trace = [];
    const keystream = [];
    for (let i = 0; i < p.length; i++) {
      const before = [...regs];
      const controls = regs.map((r, j) => Number(r[control[j]]));
      const m = majority(...controls);
      const feedback = [null, null, null], rotated = [];
      for (let j = 0; j < 3; j++) {
        if (controls[j] !== m) continue;
        const t = taps[j].reduce((acc, index) => acc ^ Number(regs[j][index]), 0);
        feedback[j] = t;
        regs[j] = String(t) + regs[j].slice(0, -1);
        rotated.push("XYZ"[j]);
      }
      const outputBits = regs.map((r, j) => Number(r[output[j]]));
      const bit = outputBits[0] ^ outputBits[1] ^ outputBits[2];
      keystream.push(String(bit));
      if (trace.length < MAX_TRACE) trace.push({
        cycle: i + 1, frame: null, before, controls, majority: m,
        rotated: rotated.join(""), feedback, after: [...regs], outputBits, s: bit
      });
    }
    return {mode: "tiny", initial, trace, s: keystream.join(""), framesUsed: 0};
  }

  const A5_MASK = [0x7ffff, 0x3fffff, 0x7fffff];
  const A5_TAPS = [0x72000, 0x300000, 0x700080];
  // Các mask tương ứng: X={13,16,17,18}, Y={20,21}, Z={7,20,21,22}.
  function bit(reg, pos) { return (reg >>> pos) & 1; }
  function parity(value) {
    value ^= value >>> 16;
    value ^= value >>> 8;
    value ^= value >>> 4;
    value &= 0xf;
    return (0x6996 >>> value) & 1;
  }
  function clockOne(regs, j) {
    const t = parity(regs[j] & A5_TAPS[j]);
    regs[j] = ((regs[j] << 1) & A5_MASK[j]) | t;
    return t;
  }
  function clockAll(regs) { for (let j = 0; j < 3; j++) clockOne(regs, j); }
  function clockMajority(regs) {
    const controls = [bit(regs[0], 8), bit(regs[1], 10), bit(regs[2], 10)];
    const m = majority(...controls);
    const feedback = [null, null, null], rotated = [];
    for (let j = 0; j < 3; j++) {
      if (controls[j] === m) {
        feedback[j] = clockOne(regs, j);
        rotated.push("XYZ"[j]);
      }
    }
    const outputBits = [bit(regs[0], 18), bit(regs[1], 21), bit(regs[2], 22)];
    return {controls, majority: m, feedback, rotated: rotated.join(""), outputBits,
      s: outputBits[0] ^ outputBits[1] ^ outputBits[2]};
  }
  function keyBitsToBytes(key) {
    if (!/^[01]{64}$/.test(key)) throw Error("A5/1 yêu cầu khóa K gồm đúng 64 bit.");
    // 8 byte viết nhị phân theo thứ tự từ trái sang phải, bit MSB ở đầu mỗi byte.
    return binaryToBytes(key);
  }
  function initA5(keyBytes, frame) {
    const regs = [0, 0, 0];
    // Nạp K (64 chu kỳ). Mỗi byte nạp từ bit thấp đến bit cao (LSB trước).
    // Theo A5/1 GSM, trong lúc nạp khóa và frame: quay tất cả thanh ghi.
    for (let i = 0; i < 64; i++) {
      clockAll(regs);
      const input = (keyBytes[Math.floor(i / 8)] >>> (i % 8)) & 1;
      regs[0] ^= input; regs[1] ^= input; regs[2] ^= input;
    }
    // Nạp số frame 22 bit, bit thấp trước.
    for (let i = 0; i < 22; i++) {
      clockAll(regs);
      const input = (frame >>> i) & 1;
      regs[0] ^= input; regs[1] ^= input; regs[2] ^= input;
    }
    // Bỏ 100 chu kỳ đầu để trộn trạng thái (majority clocking).
    for (let i = 0; i < 100; i++) clockMajority(regs);
    return regs;
  }
  function runA5(p, k, frameStart, direction = "a2b") {
    if (!Number.isInteger(frameStart) || frameStart < 0 || frameStart >= (1 << 22))
      throw Error("Số frame phải từ 0 đến 4194303 (22 bit).");
    if (!(["a2b", "b2a"].includes(direction))) throw Error("Hướng dữ liệu không hợp lệ.");
    const keyBytes = keyBitsToBytes(k);
    const trace = [], s = [];
    let initial = null;
    // Mỗi frame sinh 228 bit: 114 bit A→B rồi 114 bit B→A.
    // Với mỗi nhóm tối đa 114 bit bản rõ, tăng frame và khởi tạo lại đầy đủ.
    for (let offset = 0, frameIndex = 0; offset < p.length; offset += 114, frameIndex++) {
      const frame = (frameStart + frameIndex) & 0x3fffff;
      const regs = initA5(keyBytes, frame);
      if (initial === null) initial = stateView(regs, A5.lengths);
      if (direction === "b2a") for (let j = 0; j < 114; j++) clockMajority(regs);
      const count = Math.min(114, p.length - offset);
      for (let j = 0; j < count; j++) {
        const before = stateView(regs, A5.lengths);
        const step = clockMajority(regs);
        s.push(String(step.s));
        if (trace.length < MAX_TRACE) trace.push({
          cycle: offset + j + 1, frame, before, controls: step.controls,
          majority: step.majority, feedback: step.feedback, rotated: step.rotated,
          after: stateView(regs, A5.lengths), outputBits: step.outputBits, s: step.s
        });
      }
    }
    return {mode: "a5", initial, trace, s: s.join(""),
      framesUsed: Math.ceil(p.length / 114), startFrame: frameStart, direction};
  }

  function run(mode, p, k, frameStart = 0x134, direction = "a2b") {
    if (!/^[01]+$/.test(p)) throw Error("P phải là chuỗi bit nhị phân không rỗng.");
    const base = mode === "tiny" ? runTiny(p, k)
      : mode === "a5" ? runA5(p, k, frameStart, direction)
      : (() => { throw Error("Thuật toán không hợp lệ."); })();
    const c = xorBits(p, base.s);
    const recovered = xorBits(c, base.s);
    return {...base, p, k, c, recovered, ok: recovered === p,
      totalCycles: p.length, traceLimit: MAX_TRACE};
  }
  return {run, initA5, runTiny, runA5, bytesToBinary, binaryToBytes,
    bytesToHex, hexToBytes, xorBits, MAX_TRACE};
});
