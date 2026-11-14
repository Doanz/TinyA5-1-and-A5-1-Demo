"use strict";

// ============================================================
// A5/1 Cipher Lab - giao dien thiet ke don gian, tong mau sang.
// Co the tinh bang C++/WebAssembly. Neu chua build, JS tinh
// cung quy tac de ban xem thu website ngay tren may.
// ============================================================

const SPECS = {
  tiny: {
    title: "TinyA5/1", keyLength: 20, lengths: [5, 7, 8],
    control: [0, 2, 2], taps: [[1, 3, 4], [5, 6], [1, 6, 7]],
    output: [4, 6, 7], oneBased: true,
    majority: "MAJ(x₁, y₃, z₃)",
    outputText: "sᵢ = x₅ ⊕ y₇ ⊕ z₈",
    feedbackText: ["tX = x₂ ⊕ x₄ ⊕ x₅", "tY = y₆ ⊕ y₇", "tZ = z₂ ⊕ z₇ ⊕ z₈"],
    sampleP: "1011", sampleK: "10101110010110110100",
    academic: "TinyA5/1 là mô hình thu nhỏ 5–7–8 bit phục vụ học tập, không phải thuật toán bảo mật tiêu chuẩn."
  },
  a5: {
    title: "A5/1", keyLength: 64, lengths: [19, 22, 23],
    control: [8, 10, 10], taps: [[13, 16, 17, 18], [20, 21], [7, 20, 21, 22]],
    output: [8, 10, 10], oneBased: false,
    majority: "MAJ(x₈, y₁₀, z₁₀)",
    outputText: "sᵢ = x₈ ⊕ y₁₀ ⊕ z₁₀",
    feedbackText: ["tX = x₁₃ ⊕ x₁₆ ⊕ x₁₇ ⊕ x₁₈", "tY = y₂₀ ⊕ y₂₁", "tZ = z₇ ⊕ z₂₀ ⊕ z₂₁ ⊕ z₂₂"],
    sampleP: "1011", sampleK: "1011001100101101010011010011101001101011011001010110101100101011",
    academic: "A5/1 chia trực tiếp K thành X/Y/Z và lấy bit đầu ra x8/y10/z10. Không phải quy trình GSM chuẩn (GSM còn có số frame, 100 chu kỳ khởi động và các bit đầu ra khác)."
  }
};

const $ = id => document.getElementById(id);
let selectedMode = null;
let engine = null;
let lastResult = null;
let currentCycle = 1;

function validateInputs(mode, p, k) {
  const spec = SPECS[mode];
  if (!/^[01]+$/.test(p)) return "Bản rõ P phải gồm ít nhất một bit 0 hoặc 1, không có dấu cách.";
  if (p.length > 256) return "Bản rõ P không được vượt quá 256 bit để dễ theo dõi từng vòng.";
  if (!/^[01]+$/.test(k) || k.length !== spec.keyLength) {
    return `Khóa K của ${spec.title} phải gồm chính xác ${spec.keyLength} bit nhị phân (chỉ 0 và 1).`;
  }
  return "";
}

function simulateJS(mode, p, k) {
  const error = validateInputs(mode, p, k);
  if (error) return {ok: false, error};
  const spec = SPECS[mode];
  const [xLen, yLen] = spec.lengths;
  const regs = [k.slice(0, xLen), k.slice(xLen, xLen + yLen), k.slice(xLen + yLen)];
  const initial = [...regs];
  const trace = [];
  let s = "";
  for (let n = 0; n < p.length; n++) {
    const before = [...regs];
    const controls = regs.map((reg, i) => Number(reg[spec.control[i]]));
    const majority = controls[0] + controls[1] + controls[2] >= 2 ? 1 : 0;
    const feedback = [null, null, null];
    let rotated = "";
    for (let j = 0; j < 3; j++) {
      if (controls[j] === majority) {
        const t = spec.taps[j].reduce((acc, index) => acc ^ Number(regs[j][index]), 0);
        feedback[j] = t;
        regs[j] = String(t) + regs[j].slice(0, -1);
        rotated += "XYZ"[j];
      }
    }
    const outputBits = regs.map((reg, i) => Number(reg[spec.output[i]]));
    const bit = outputBits[0] ^ outputBits[1] ^ outputBits[2];
    s += String(bit);
    trace.push({cycle: n + 1, before, controls, majority, rotated, feedback, after: [...regs], outputBits, s: bit});
  }
  const c = [...p].map((bit, i) => String(Number(bit) ^ Number(s[i]))).join("");
  const recovered = [...c].map((bit, i) => String(Number(bit) ^ Number(s[i]))).join("");
  return {ok: true, algorithm: mode, p, k, initial, s, c, recovered, trace};
}

function simulate(mode, p, k) {
  const error = validateInputs(mode, p, k);
  if (error) return {ok: false, error};
  if (engine) {
    const json = engine.ccall("simulate", "string", ["string", "string", "string"], [mode, p, k]);
    return JSON.parse(json);
  }
  return simulateJS(mode, p, k);
}

function setError(message = "") {
  $("errorBox").textContent = message;
  $("errorBox").hidden = !message;
}

function updateCounts() {
  if (!selectedMode) return;
  const p = $("plainInput").value.trim();
  const k = $("keyInput").value.trim();
  $("pCount").textContent = `${p.length} / 256 bit`;
  $("kCount").textContent = `${k.length} / ${SPECS[selectedMode].keyLength} bit`;
  $("pCount").classList.toggle("invalid", p.length > 256 || (p.length && !/^[01]+$/.test(p)));
  $("kCount").classList.toggle("invalid", k.length > 0 && (k.length !== SPECS[selectedMode].keyLength || !/^[01]+$/.test(k)));
}

function clearResults() {
  lastResult = null;
  $("roundsSection").hidden = true;
  $("resultsSection").hidden = true;
  $("traceBody").replaceChildren();
}

function populateExplanation() {
  const spec = SPECS[selectedMode];
  $("algoIntro").textContent = `${spec.title} sử dụng ba thanh ghi X, Y, Z.`;
  $("majFormula").textContent = spec.majority;
  $("outputFormula").textContent = spec.outputText;
  $("registerInfo").replaceChildren();
  ["X", "Y", "Z"].forEach((name, i) => {
    const chip = document.createElement("div"); chip.className = "register-chip";
    const strong = document.createElement("strong"); strong.textContent = name;
    const label = document.createElement("small"); label.textContent = `${spec.lengths[i]} bit`;
    chip.append(strong, label);
    $("registerInfo").append(chip);
  });
  $("indexNote").textContent = spec.oneBased
    ? "Các bit được đánh số từ 1, từ trái sang phải (x₁ là bit bên trái)."
    : "Các bit được đánh số từ 0, từ trái sang phải (x₀ là bit bên trái).";
  $("feedbackFormulas").replaceChildren();
  spec.feedbackText.forEach(text => {
    const line = document.createElement("div"); line.textContent = text;
    $("feedbackFormulas").append(line);
  });
  $("kHint").innerHTML = `<span class="hint-symbol">i</span> Nhập đúng <strong>${spec.keyLength} bit</strong> (chỉ 0 và 1, không khoảng trắng). K chia lần lượt thành X (${spec.lengths[0]}), Y (${spec.lengths[1]}) và Z (${spec.lengths[2]}).`;
  $("keyInput").placeholder = `Nhập đúng ${spec.keyLength} bit 0/1`;
  $("academicNote").textContent = spec.academic;
}

function chooseMode(mode) {
  selectedMode = mode;
  $("workspace").hidden = false;
  $("selectionHelp").textContent = `Đã chọn ${SPECS[mode].title}. Bạn có thể nhập P và K bên dưới.`;
  document.querySelectorAll(".algorithm-choice").forEach(button => {
    const active = button.dataset.algo === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  $("plainInput").value = "";
  $("keyInput").value = "";
  clearResults();
  setError();
  populateExplanation();
  updateCounts();
}

function useSample() {
  if (!selectedMode) return;
  const spec = SPECS[selectedMode];
  $("plainInput").value = spec.sampleP;
  $("keyInput").value = spec.sampleK;
  updateCounts();
  setError();
  clearResults();
}

function createCell(row, value) {
  const td = document.createElement("td");
  td.textContent = value;
  row.append(td);
}

function showCycle(n) {
  if (!lastResult || n < 1 || n > lastResult.trace.length) return;
  currentCycle = n;
  const step = lastResult.trace[n - 1];
  const spec = SPECS[selectedMode];
  const rotated = step.rotated.split("").join(", ");
  $("detailTitle").textContent = `Chi tiết vòng ${n}`;
  $("detailSummary").textContent = `Bit điều khiển: ${step.controls.join(" / ")} · MAJ = ${step.majority} · Quay: ${rotated} · s${n} = ${step.s}`;
  $("prevBtn").disabled = n === 1;
  $("nextBtn").disabled = n === lastResult.trace.length;
  $("registerDetails").replaceChildren();
  ["X", "Y", "Z"].forEach((name, i) => {
    const card = document.createElement("div"); card.className = "register-detail";
    const strong = document.createElement("strong"); strong.textContent = `Thanh ghi ${name}`;
    const moved = step.rotated.includes(name);
    const badge = document.createElement("small"); badge.textContent = moved ? "↻ Đã quay" : "Giữ nguyên";
    if (!moved) badge.className = "not-rotated";
    card.append(strong, badge);
    const line1 = document.createElement("div"); line1.className = "state-line"; line1.textContent = "Trước quay";
    const before = document.createElement("code"); before.textContent = step.before[i];
    const line2 = document.createElement("div"); line2.className = "state-line after"; line2.textContent = "Sau quay";
    const after = document.createElement("code"); after.textContent = step.after[i];
    const note = document.createElement("div"); note.className = "state-line";
    note.textContent = `Điều khiển: ${step.controls[i]} · t: ${step.feedback[i] ?? "—"} · Bit đầu ra: ${step.outputBits[i]} (vị trí ${spec.output[i] + (spec.oneBased ? 1 : 0)})`;
    card.append(line1, before, line2, after, note);
    $("registerDetails").append(card);
  });
  document.querySelectorAll("#traceBody tr").forEach(row => {
    row.classList.toggle("selected", Number(row.dataset.cycle) === n);
    row.setAttribute("aria-selected", String(Number(row.dataset.cycle) === n));
  });
}

function renderTrace() {
  const {trace} = lastResult;
  $("traceBody").replaceChildren();
  trace.forEach(step => {
    const row = document.createElement("tr");
    row.dataset.cycle = String(step.cycle);
    row.tabIndex = 0;
    row.setAttribute("aria-label", `Xem chi tiết vòng ${step.cycle}`);
    const values = [step.cycle, step.controls.join(" / "), step.majority,
      step.rotated.split("").join(", "), step.feedback.map(x => x ?? "—").join(" / "),
      ...step.after, step.s];
    values.forEach(v => createCell(row, String(v)));
    row.addEventListener("click", () => showCycle(step.cycle));
    row.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showCycle(step.cycle); } });
    $("traceBody").append(row);
  });
  $("roundCount").textContent = `${trace.length} chu kỳ`;
  $("keystreamText").textContent = lastResult.s;
  showCycle(1);
}

function renderResult() {
  $("outP").textContent = lastResult.p;
  $("outS").textContent = lastResult.s;
  $("outC").textContent = lastResult.c;
  $("outRecovered").textContent = lastResult.recovered;
  const passed = lastResult.recovered === lastResult.p;
  $("resultStatus").textContent = passed ? "✓ KIỂM THỬ PASS" : "KIỂM THỬ FAIL";
  $("resultStatus").classList.toggle("fail", !passed);
  $("resultFoot").textContent = passed ? "Giải mã thành công: P sau giải mã trùng khớp với bản rõ ban đầu." : "Kết quả giải mã không trùng bản rõ. Hãy kiểm tra lại thuật toán.";
}

function runSimulation(event) {
  event?.preventDefault();
  if (!selectedMode) return;
  const p = $("plainInput").value.trim();
  const k = $("keyInput").value.trim();
  try {
    const result = simulate(selectedMode, p, k);
    if (!result.ok) { setError(result.error || "Đầu vào không hợp lệ."); clearResults(); return; }
    lastResult = result;
    setError();
    $("roundsSection").hidden = false;
    $("resultsSection").hidden = false;
    renderTrace();
    renderResult();
    $("roundsSection").scrollIntoView({behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start"});
  } catch (error) {
    clearResults();
    setError(`Không thể mô phỏng: ${error.message}`);
  }
}

async function copyResult(property, button) {
  if (!lastResult) return;
  const value = lastResult[property];
  try {
    await navigator.clipboard.writeText(value);
    const original = button.textContent;
    button.textContent = "✓ Đã sao chép";
    setTimeout(() => button.textContent = original, 1400);
  } catch {
    const element = property === "c" ? $("outC") : $("outRecovered");
    const range = document.createRange(); range.selectNodeContents(element);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    button.textContent = "Hãy nhấn Ctrl+C";
  }
}

async function initWebAssembly() {
  if (typeof createCipherModule !== "function") {
    $("engineStatus").innerHTML = '<span class="status-dot"></span> JavaScript · sẵn sàng';
    return;
  }
  try {
    engine = await createCipherModule({ locateFile: name => name });
    $("engineStatus").classList.add("wasm");
    $("engineStatus").innerHTML = '<span class="status-dot"></span> C++ / WebAssembly';
  } catch (error) {
    console.warn("Chua tai duoc WebAssembly, dung JavaScript:", error);
    $("engineStatus").innerHTML = '<span class="status-dot"></span> JavaScript · sẵn sàng';
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".algorithm-choice").forEach(btn => btn.addEventListener("click", () => chooseMode(btn.dataset.algo)));
  ["plainInput", "keyInput"].forEach(id => $(id).addEventListener("input", () => { updateCounts(); setError(); clearResults(); }));
  $("sampleBtn").addEventListener("click", useSample);
  $("cipherForm").addEventListener("submit", runSimulation);
  $("prevBtn").addEventListener("click", () => showCycle(currentCycle - 1));
  $("nextBtn").addEventListener("click", () => showCycle(currentCycle + 1));
  document.querySelectorAll(".copy-result").forEach(btn => btn.addEventListener("click", () => copyResult(btn.dataset.copy, btn)));
  document.addEventListener("keydown", e => { if (e.ctrlKey && e.key === "Enter" && selectedMode) runSimulation(e); });
  initWebAssembly();
});
