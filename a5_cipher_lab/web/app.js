"use strict";
/* Giao diện website. Phần thuật toán nằm trong cipher-core.js */
const $ = id => document.getElementById(id);
const Core = window.CipherCore;
const MAX_BITS = 4096;
const MAX_TEXT_BYTES = 2048;
const MAX_FILE_BYTES = 32 * 1024;
const KEY_A5_HEX = "1223456789ABCDEF";
const SPECS = {
  tiny: {
    title: "TinyA5/1 (cùng cấu hình với Python)", keyLength: 23, lengths: [6, 8, 9],
    sampleK: "10101110010110110100101",
    intro: "Khóa K được chia trực tiếp thành X/Y/Z như chương trình Python của dự án.",
    init: "Khóa 23 bit → X 6 bit, Y 8 bit, Z 9 bit. Đánh số bit từ 0 ở bên trái (giống phép lấy chỉ số chuỗi Python).",
    maj: "MAJ(x₁, y₃, z₃)",
    feedback: ["tX = x₁ ⊕ x₃ ⊕ x₄", "tY = y₅ ⊕ y₆", "tZ = z₁ ⊕ z₆ ⊕ z₇"],
    output: "sᵢ = x₅ ⊕ y₇ ⊕ z₈",
    academic: "TinyA5/1 6–8–9 / 23 bit khớp với tệp Python hiện có. Đây là mô hình giáo dục, không phải tiêu chuẩn mật mã. Các vị trí phản hồi là chỉ số 0-based trong mã nguồn; tương đương các tap (2,4,5), (6,7), (2,7,8) nếu đếm từ 1."
  },
  a5: {
    title: "A5/1 với khởi tạo GSM", keyLength: 64, lengths: [19, 22, 23],
    sampleK: Core.bytesToBinary(Core.hexToBytes(KEY_A5_HEX)),
    intro: "Khởi tạo chuẩn A5/1: các thanh ghi bắt đầu bằng 0; nạp khóa và số khung trước khi tạo dòng khóa.",
    init: "X/Y/Z: 19/22/23 bit, ban đầu bằng 0. Nạp K 64 bit và frame 22 bit (LSB trước), chạy 100 chu kỳ majority không xuất bit. Mỗi frame cấp 114 bit cho một hướng.",
    maj: "MAJ(x₈, y₁₀, z₁₀)",
    feedback: ["tX = x₁₃ ⊕ x₁₆ ⊕ x₁₇ ⊕ x₁₈", "tY = y₂₀ ⊕ y₂₁", "tZ = z₇ ⊕ z₂₀ ⊕ z₂₁ ⊕ z₂₂"],
    output: "sᵢ = x₁₈ ⊕ y₂₁ ⊕ z₂₂",
    academic: "A5/1 GSM: chỉ số bit tính từ LSB = 0 (bên phải khi xem chuỗi). Demo nhiều frame lần lượt tăng số khung 22 bit, dùng 114 bit mỗi frame cho một hướng. Đây là mô phỏng dòng khóa, không phải hệ thống GSM hoàn chỉnh. A5/1 không an toàn cho dữ liệu thực tế."
  }
};
let selectedMode = null;
let inputFormat = "binary";
let lastResult = null;
let currentCycle = 1;
let exported = null;
let activeObjectUrls = [];

function clearUrls() { activeObjectUrls.forEach(url => URL.revokeObjectURL(url)); activeObjectUrls = []; }
function setError(text = "") { $("errorBox").textContent = text; $("errorBox").hidden = !text; }
function clearResults() {
  lastResult = null; exported = null; clearUrls();
  $("traceBody").replaceChildren();
  $("roundsSection").hidden = true;
  $("resultsSection").hidden = true;
  $("filePreview").hidden = true;
  $("downloadRow").hidden = true;
  $("fileImages").replaceChildren();
}
function updateCounts() {
  if (!selectedMode) return;
  const binary = $("plainInput").value.trim();
  const key = $("keyInput").value.trim();
  const byteLength = new TextEncoder().encode($("textInput").value).length;
  $("pCount").textContent = `${binary.length} / ${MAX_BITS} bit`;
  $("textCount").textContent = `${byteLength} / ${MAX_TEXT_BYTES} byte`;
  $("kCount").textContent = `${key.length} / ${SPECS[selectedMode].keyLength} bit`;
  $("pCount").classList.toggle("invalid", binary.length > MAX_BITS || (binary.length > 0 && !/^[01]+$/.test(binary)));
  $("textCount").classList.toggle("invalid", byteLength > MAX_TEXT_BYTES);
  $("kCount").classList.toggle("invalid", key.length !== SPECS[selectedMode].keyLength || !/^[01]*$/.test(key));
}
function populateExplanation() {
  const spec = SPECS[selectedMode];
  $("algoIntro").textContent = spec.intro;
  $("registerInfo").replaceChildren();
  ["X", "Y", "Z"].forEach((name, i) => {
    const cell = document.createElement("div"); cell.className = "register-chip";
    const strong = document.createElement("strong"); strong.textContent = name;
    const small = document.createElement("small"); small.textContent = `${spec.lengths[i]} bit`;
    cell.append(strong, small); $("registerInfo").append(cell);
  });
  $("initInfo").textContent = spec.init;
  $("majFormula").textContent = spec.maj;
  $("outputFormula").textContent = spec.output;
  $("feedbackFormulas").replaceChildren();
  for (const line of spec.feedback) {
    const element = document.createElement("div"); element.textContent = line;
    $("feedbackFormulas").append(element);
  }
  $("modeAcademicNote").textContent = spec.academic;
  $("kHint").innerHTML = `<span class="hint-symbol">i</span> Nhập <strong>chính xác ${spec.keyLength} bit</strong>, chỉ gồm 0 hoặc 1, không có dấu cách. ${selectedMode === "a5" ? "8 byte của khóa được nhập theo thứ tự hiển thị (MSB trước trong mỗi byte); khi khởi tạo sẽ nạp LSB trước." : "Khóa chia lần lượt thành 6 + 8 + 9 bit."}`;
  $("keyInput").placeholder = `Khóa ${spec.keyLength} bit nhị phân (0 hoặc 1)`;
  $("frameOptions").hidden = selectedMode !== "a5";
  updateCounts();
}
function selectMode(mode) {
  selectedMode = mode;
  $("workspace").hidden = false;
  $("selectionHelp").textContent = `Đã chọn ${SPECS[mode].title}. Hãy nhập P và K ở phía dưới.`;
  document.querySelectorAll(".algorithm-choice").forEach(btn => {
    const selected = btn.dataset.algo === mode;
    btn.classList.toggle("active", selected);
    btn.setAttribute("aria-pressed", String(selected));
  });
  $("plainInput").value = ""; $("textInput").value = "";
  $("keyInput").value = ""; $("fileInput").value = "";
  $("frameInput").value = "0x134";
  setError(); clearResults(); populateExplanation();
}
function selectFormat(format) {
  inputFormat = format;
  ["binary", "text", "file"].forEach(name => {
    $({binary: "binaryFields", text: "textFields", file: "fileFields"}[name]).hidden = name !== format;
  });
  document.querySelectorAll(".mode-btn").forEach(btn => {
    const active = btn.dataset.format === format;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
  clearResults(); setError();
}
function useSample() {
  if (!selectedMode) return;
  if (inputFormat === "file") selectFormat("text");
  $("plainInput").value = "1011";
  $("textInput").value = "Xin chào!";
  $("keyInput").value = SPECS[selectedMode].sampleK;
  $("frameInput").value = "0x134";
  setError(); updateCounts(); clearResults();
}
function readFrame(value) {
  const cleaned = value.trim();
  if (!/^(?:0[xX][0-9a-fA-F]+|[0-9]+)$/.test(cleaned))
    throw Error("Số frame phải là số thập phân hoặc HEX bắt đầu bằng 0x.");
  const frame = /^0[xX]/.test(cleaned) ? parseInt(cleaned, 16) : Number(cleaned);
  if (!Number.isInteger(frame) || frame < 0 || frame > 4194303)
    throw Error("Số frame phải nằm trong khoảng 0–4194303 (22 bit).");
  return frame;
}
function validFile(file) {
  return file && (file.type.startsWith("text/") || ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)
    || /\.(txt|md|csv|json)$/i.test(file.name));
}
async function getPlaintext() {
  if (inputFormat === "binary") {
    const bits = $("plainInput").value.trim();
    if (!/^[01]+$/.test(bits)) throw Error("Bản rõ P phải là dãy bit 0/1 không rỗng.");
    if (bits.length > MAX_BITS) throw Error(`Bản rõ nhị phân không được vượt quá ${MAX_BITS} bit.`);
    return {bits, label: "Nhị phân", name: "binary-message", originalBytes: null};
  }
  if (inputFormat === "text") {
    const text = $("textInput").value;
    const bytes = new TextEncoder().encode(text);
    if (!bytes.length) throw Error("Hãy nhập bản rõ văn bản trước khi chạy.");
    if (bytes.length > MAX_TEXT_BYTES) throw Error(`Văn bản không được vượt quá ${MAX_TEXT_BYTES} byte UTF-8.`);
    return {bits: Core.bytesToBinary(bytes), bytes, originalBytes: bytes, text, label: "UTF-8", name: "message.txt"};
  }
  const file = $("fileInput").files[0];
  if (!file) throw Error("Bạn chưa chọn tệp văn bản hoặc ảnh.");
  if (!validFile(file)) throw Error("Chỉ hỗ trợ tệp văn bản hoặc ảnh PNG/JPEG/WEBP/GIF.");
  if (!file.size) throw Error("Tệp rỗng, không có dữ liệu để mã hóa.");
  if (file.size > MAX_FILE_BYTES) throw Error("Tệp vượt quá 32 KB. Hãy chọn ảnh/tệp nhỏ hơn.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  return {bits: Core.bytesToBinary(bytes), bytes, originalBytes: bytes,
    label: "Tệp", name: file.name, mime: file.type || "application/octet-stream"};
}
function abbreviate(text, limit = 144) {
  return text.length > limit ? text.slice(0, limit) + `… (${text.length} ký tự)` : text;
}
function cell(tr, value) { const td = document.createElement("td"); td.textContent = value; tr.append(td); }
function renderTrace(result) {
  $("roundsSection").hidden = false;
  $("roundCount").textContent = `${result.totalCycles.toLocaleString("vi-VN")} bit / ${result.framesUsed || 1} ${selectedMode === "a5" ? "frame" : "lượt"}; hiển thị ${result.trace.length} chu kỳ đầu`;
  $("keystreamText").textContent = result.s.slice(0, 96) + (result.s.length > 96 ? "…" : "");
  $("traceBody").replaceChildren();
  for (const step of result.trace) {
    const tr = document.createElement("tr"); tr.tabIndex = 0;
    const values = [step.cycle, step.frame === null ? "—" : `0x${step.frame.toString(16)}`,
      step.controls.join(" / "), step.majority, step.rotated.split("").join(", "),
      step.feedback.map(n => n === null ? "—" : n).join(" / "),
      ...step.after, step.s];
    values.forEach(v => cell(tr, v));
    tr.addEventListener("click", () => showCycle(step.cycle));
    tr.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); showCycle(step.cycle); } });
    $("traceBody").append(tr);
  }
  if (result.trace.length) showCycle(1);
}
function showCycle(cycle) {
  if (!lastResult || cycle < 1 || cycle > lastResult.trace.length) return;
  currentCycle = cycle;
  const step = lastResult.trace[cycle - 1];
  $("detailTitle").textContent = `Chi tiết vòng ${cycle}`;
  $("detailSummary").textContent = `${step.frame === null ? "TinyA5/1" : `Frame ${step.frame}`} · Điều khiển ${step.controls.join(" / ")} · MAJ = ${step.majority} · Quay ${step.rotated} · Bit khóa s${cycle} = ${step.s}`;
  $("prevBtn").disabled = cycle === 1;
  $("nextBtn").disabled = cycle === lastResult.trace.length;
  $("registerDetails").replaceChildren();
  ["X", "Y", "Z"].forEach((name, j) => {
    const div = document.createElement("div"); div.className = "register-detail";
    const h = document.createElement("strong"); h.textContent = `Thanh ghi ${name}`;
    const active = step.rotated.includes(name);
    const b = document.createElement("small"); b.textContent = active ? "↻ Quay" : "Giữ nguyên";
    if (!active) b.classList.add("not-rotated");
    const first = document.createElement("div"); first.className = "state-line"; first.textContent = "Trước:";
    const firstCode = document.createElement("code"); firstCode.textContent = step.before[j];
    const second = document.createElement("div"); second.className = "state-line after";
    second.textContent = `Sau (t = ${step.feedback[j] === null ? "—" : step.feedback[j]}):`;
    const secondCode = document.createElement("code"); secondCode.textContent = step.after[j];
    div.append(h, b, first, firstCode, second, secondCode);
    $("registerDetails").append(div);
  });
  Array.from($("traceBody").children).forEach((tr, i) => tr.classList.toggle("selected", i === cycle - 1));
}
function newDownload(bytes, filename, mime = "application/octet-stream") {
  const blob = new Blob([bytes], {type: mime});
  const url = URL.createObjectURL(blob); activeObjectUrls.push(url);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
}
function makeImageCard(bytes, caption, mime) {
  const figure = document.createElement("figure");
  const img = document.createElement("img"); img.alt = caption;
  const url = URL.createObjectURL(new Blob([bytes], {type: mime}));
  activeObjectUrls.push(url); img.src = url;
  const figcaption = document.createElement("figcaption"); figcaption.textContent = caption;
  figure.append(img, figcaption); return figure;
}
function renderResults(result, input) {
  $("resultsSection").hidden = false;
  const correct = result.ok && result.recovered === input.bits;
  $("resultStatus").textContent = correct ? "PASS" : "FAIL";
  $("resultStatus").classList.toggle("fail", !correct);
  $("resultFoot").textContent = correct
    ? `Đã khôi phục toàn bộ ${input.bits.length.toLocaleString("vi-VN")} bit của bản rõ; ${result.framesUsed ? `${result.framesUsed} frame A5/1` : "TinyA5/1"}.`
    : "Giải mã không trùng với dữ liệu ban đầu.";
  exported = {format: inputFormat, c: result.c, recovered: result.recovered};
  if (inputFormat === "binary") {
    $("resultType").textContent = "Dữ liệu nhị phân — C = P ⊕ S; giải mã P = C ⊕ S.";
    $("cipherLabel").textContent = "BẢN MÃ C (NHỊ PHÂN)";
    $("recoverLabel").textContent = "BẢN RÕ KHÔI PHỤC (NHỊ PHÂN)";
    $("outP").textContent = abbreviate(input.bits, 200);
    $("outS").textContent = abbreviate(result.s, 200);
    $("outC").textContent = abbreviate(result.c, 180);
    $("outRecovered").textContent = abbreviate(result.recovered, 180);
    return;
  }
  const encrypted = Core.binaryToBytes(result.c);
  const decrypted = Core.binaryToBytes(result.recovered);
  exported.encryptedBytes = encrypted;
  exported.decryptedBytes = decrypted;
  exported.filename = input.name;
  exported.mime = input.mime || "text/plain;charset=utf-8";
  $("resultType").textContent = `Dữ liệu ${input.label}: byte → bit → XOR → byte. Kết quả đầy đủ có thể tải về.`;
  $("cipherLabel").textContent = "BẢN MÃ C (HEX, PHẦN ĐẦU)";
  $("recoverLabel").textContent = inputFormat === "text" ? "VĂN BẢN SAU GIẢI MÃ" : "TỆP SAU GIẢI MÃ";
  $("outP").textContent = inputFormat === "text" ? abbreviate(input.text, 120) : `${input.name} (${input.bytes.length} byte)`;
  $("outS").textContent = Core.bytesToHex(Core.binaryToBytes(result.s), 32) + (result.s.length > 256 ? "…" : "");
  $("outC").textContent = Core.bytesToHex(encrypted, 64) + (encrypted.length > 64 ? "…" : "");
  $("outRecovered").textContent = inputFormat === "text" ? abbreviate(new TextDecoder().decode(decrypted), 180)
    : `Khôi phục nguyên vẹn ${input.name} (${decrypted.length} byte)`;
  $("downloadRow").hidden = false;
  $("copyCipher").textContent = "Sao chép HEX đầu";
  $("copyRecovered").textContent = "Sao chép kết quả";
  if (inputFormat === "file") {
    $("filePreview").hidden = false;
    const equal = input.bytes.length === decrypted.length && input.bytes.every((b, i) => b === decrypted[i]);
    $("fileResultInfo").textContent = `So sánh byte gốc và byte giải mã: ${equal ? "KHỚP 100%" : "KHÔNG KHỚP"}. Tải tệp đã giải mã để mở bằng phần mềm tương ứng.`;
    if (input.mime && input.mime.startsWith("image/")) {
      $("fileImages").append(makeImageCard(input.bytes, "Ảnh gốc", input.mime));
      $("fileImages").append(makeImageCard(decrypted, "Ảnh khôi phục", input.mime));
    }
  }
}
async function onSubmit(event) {
  event.preventDefault();
  if (!selectedMode) return;
  setError(); clearResults();
  try {
    const k = $("keyInput").value.trim();
    if (!new RegExp(`^[01]{${SPECS[selectedMode].keyLength}}$`).test(k))
      throw Error(`Khóa K cần chính xác ${SPECS[selectedMode].keyLength} bit, chỉ gồm 0 hoặc 1.`);
    const input = await getPlaintext();
    const frame = selectedMode === "a5" ? readFrame($("frameInput").value) : 0;
    const direction = selectedMode === "a5" ? $("directionInput").value : "a2b";
    const result = Core.run(selectedMode, input.bits, k, frame, direction);
    lastResult = result;
    renderTrace(result);
    renderResults(result, input);
    $("roundsSection").scrollIntoView({behavior: "smooth", block: "start"});
  } catch (error) { setError(error.message || "Lỗi không xác định."); }
}
async function copyText(value) {
  try { await navigator.clipboard.writeText(value); }
  catch (_) { window.prompt("Sao chép nội dung:", value); }
}
function boot() {
  document.querySelectorAll(".algorithm-choice").forEach(btn => btn.addEventListener("click", () => selectMode(btn.dataset.algo)));
  document.querySelectorAll(".mode-btn").forEach(btn => btn.addEventListener("click", () => selectFormat(btn.dataset.format)));
  ["plainInput", "keyInput", "textInput"].forEach(id => $(id).addEventListener("input", updateCounts));
  $("fileInput").addEventListener("change", () => {
    const file = $("fileInput").files[0];
    $("fileDescription").textContent = file ? `${file.name} · ${file.size.toLocaleString("vi-VN")} byte` : "Chưa chọn tệp.";
    setError(); clearResults();
  });
  $("sampleBtn").addEventListener("click", useSample);
  $("cipherForm").addEventListener("submit", onSubmit);
  $("prevBtn").addEventListener("click", () => showCycle(currentCycle - 1));
  $("nextBtn").addEventListener("click", () => showCycle(currentCycle + 1));
  $("copyCipher").addEventListener("click", () => exported && copyText(exported.encryptedBytes ? Core.bytesToHex(exported.encryptedBytes, 64) : exported.c));
  $("copyRecovered").addEventListener("click", () => exported && copyText(exported.format === "binary" ? exported.recovered : $("outRecovered").textContent));
  $("downloadCipher").addEventListener("click", () => exported && exported.encryptedBytes && newDownload(exported.encryptedBytes, exported.filename + ".enc"));
  $("downloadRecovered").addEventListener("click", () => exported && exported.decryptedBytes && newDownload(exported.decryptedBytes, "recovered_" + exported.filename, exported.mime));
  window.addEventListener("beforeunload", clearUrls);
}
boot();
