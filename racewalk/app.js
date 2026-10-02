// RaceWalk Lab — 瀏覽器內姿態估計 (MediaPipe Pose)，影片不離開此裝置
const VISION = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const STORE = "racewalk.records.v1";
const MAX_BYTES = 100 * 1024 * 1024;
const MAX_FRAMES = 600;

const $ = (id) => document.getElementById(id);
const L = { sh: [11, 12], hip: [23, 24], knee: [25, 26], ank: [27, 28], heel: [29, 30], toe: [31, 32] }; // [左,右]
const BONES = [[11,12],[11,23],[12,24],[23,24],[23,25],[25,27],[27,29],[27,31],[24,26],[26,28],[28,30],[28,32],[11,13],[13,15],[12,14],[14,16]];

const state = { tab: "work", mode: "analysis", file: null, url: null, frames: [], analysis: null, record: null, landmarker: null, busy: false, idx: 0 };

// ---------- 小工具 ----------
const status = (msg, err) => { $("status").textContent = msg || ""; $("status").className = "status" + (err ? " err" : ""); };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const loadRecords = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; } };
const saveRecords = (r) => { try { localStorage.setItem(STORE, JSON.stringify(r)); return true; } catch { return false; } };
const labels = { view: { "side-left": "側面・左腳近鏡頭", "side-right": "側面・右腳近鏡頭", front: "正面", rear: "後面" }, speed: { easy: "Easy", race: "Race", fast: "Fast" }, body: { unknown: "尚未確認", none: "無不適", yes: "有不適／跛行" } };
$("fDate").value = new Date().toISOString().slice(0, 10);

// ---------- 分頁 ----------
function setTab(t) {
  state.tab = t;
  document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === t));
  ["work", "report", "history", "guide"].forEach((k) => ($("tab-" + k).hidden = k !== t));
  if (t === "report") renderReport();
  if (t === "history") renderHistory();
}
document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
document.querySelectorAll(".mode-toggle button").forEach((b) => b.addEventListener("click", () => {
  state.mode = b.dataset.mode;
  document.querySelectorAll(".mode-toggle button").forEach((x) => x.classList.toggle("active", x === b));
  drawCurrent();
}));

// ---------- 匯入影片 ----------
const pick = () => $("videoInput").click();
$("btnPick").onclick = $("btnPick2").onclick = $("btnReplace").onclick = pick;
$("videoInput").onchange = (e) => e.target.files[0] && loadVideo(e.target.files[0]);
const dz = $("dropZone");
dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("drag"); });
dz.addEventListener("dragleave", () => dz.classList.remove("drag"));
dz.addEventListener("drop", (e) => { e.preventDefault(); dz.classList.remove("drag"); e.dataTransfer.files[0] && loadVideo(e.dataTransfer.files[0]); });

function loadVideo(file) {
  setTab("work");
  if (state.busy) return;
  if (!/^video\//.test(file.type) && !/\.(mov|m4v|mp4|webm)$/i.test(file.name)) return status("請選擇影片檔（MP4／MOV／WebM）", true);
  if (file.size > MAX_BYTES) return status("檔案超過 100 MB，請先裁短或壓縮。", true);
  if (state.url) URL.revokeObjectURL(state.url);
  state.file = file; state.url = URL.createObjectURL(file);
  state.frames = []; state.analysis = null; state.record = null; state.idx = 0;
  const v = $("video");
  v.onloadedmetadata = () => {
    $("overlay").width = v.videoWidth; $("overlay").height = v.videoHeight;
    $("dropZone").hidden = true; $("viewer").hidden = false; $("controls").hidden = true; $("keyChips").innerHTML = "";
    $("fileName").textContent = `${file.name} · ${v.duration.toFixed(1)} 秒 · ${v.videoWidth}×${v.videoHeight}`;
    const ctx = $("overlay").getContext("2d"); ctx.clearRect(0, 0, v.videoWidth, v.videoHeight);
    status(v.duration > 30 ? "影片較長，建議裁成 10–15 秒再分析。" : "按「開始分析」。");
  };
  v.onerror = () => status("瀏覽器無法讀取此影片格式，請轉成 MP4 (H.264) 再試。", true);
  v.src = state.url;
  $("btnSave").disabled = true;
}

// ---------- 姿態模型 ----------
async function getLandmarker() {
  if (state.landmarker) return state.landmarker;
  status("載入姿態模型中（首次需連網）…");
  const { PoseLandmarker, FilesetResolver } = await import(`${VISION}/vision_bundle.mjs`);
  const fileset = await FilesetResolver.forVisionTasks(`${VISION}/wasm`);
  const make = (delegate) => PoseLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: "IMAGE", numPoses: 1 });
  try { state.landmarker = await make("GPU"); } catch { state.landmarker = await make("CPU"); }
  return state.landmarker;
}

const seek = (v, t) => new Promise((res) => {
  if (Math.abs(v.currentTime - t) < 1e-4) return res();
  v.addEventListener("seeked", () => res(), { once: true });
  v.currentTime = t;
});

// ---------- 分析 ----------
$("btnAnalyze").onclick = analyze;
async function analyze() {
  if (state.busy) return;
  const v = $("video");
  state.busy = true; $("btnAnalyze").disabled = true; $("progress").hidden = false;
  try {
    const lm = await getLandmarker();
    const slow = +$("fSlow").value, perSec = Math.min(+$("fSample").value, +$("fFps").value);
    const step = slow / perSec; // 影片時間間隔
    const n = Math.min(MAX_FRAMES, Math.floor(v.duration / step));
    if (n < 8) throw new Error("影片太短，無法分析。");
    v.pause();
    const frames = [];
    for (let i = 0; i < n; i++) {
      const t = Math.min(i * step, v.duration - 0.001);
      await seek(v, t);
      const r = lm.detect(v);
      const p = r.landmarks && r.landmarks[0];
      frames.push({ t, lm: p ? p.map((q) => [q.x, q.y, q.visibility ?? 1]) : null });
      $("bar").style.width = ((i + 1) / n * 100) + "%";
      $("progressText").textContent = `分析中 ${i + 1} / ${n}`;
      if (i % 10 === 0) await new Promise((r2) => setTimeout(r2, 0));
    }
    state.frames = frames;
    state.analysis = compute(frames, v.videoWidth, v.videoHeight);
    $("progress").hidden = true;
    initControls();
    buildChips();
    status(`完成：偵測到 ${state.analysis.detected}/${frames.length} 幀姿態。可拖曳時間軸複查，或到「本次報告」。`);
    await captureKeyFrames();
    $("btnSave").disabled = false;
    $("saveMeta").textContent = "尚未儲存";
  } catch (e) {
    console.error(e);
    status("分析失敗：" + (e.message || e), true);
    $("progress").hidden = true;
  } finally { state.busy = false; $("btnAnalyze").disabled = false; }
}

function angle(a, b, c) { // b 為頂點，回傳度
  const v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]];
  const d = Math.hypot(...v1) * Math.hypot(...v2);
  if (!d) return null;
  return Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / d))) * 180 / Math.PI;
}
const smooth = (a) => a.map((_, i) => { const w = [a[i - 1], a[i], a[i + 1]].filter((x) => x != null); return w.length ? avg(w) : null; });

function compute(frames, W, H) {
  const dir = $("fDir").value === "right" ? 1 : -1;
  const view = $("fView").value, side = view.startsWith("side");
  const confirmed = $("fConfirm").checked, slow = +$("fSlow").value;
  const px = (f, i) => [f.lm[i][0] * W, f.lm[i][1] * H];
  const ok = (f, ids) => f.lm && ids.every((i) => f.lm[i][2] > 0.4);
  const detected = frames.filter((f) => f.lm).length;
  const out = { detected, side, steps: [], flags: [], notes: [], confirmed };

  // 身高尺度：肩到踝的平均像素長
  const lens = frames.filter((f) => ok(f, [11, 23, 27])).map((f) => Math.hypot(...px(f, 11).map((x, k) => x - px(f, 27)[k])));
  const body = avg(lens) || H * 0.6;
  out.body = body;

  // 軀幹前後傾（側面）
  if (side) {
    const lean = frames.filter((f) => ok(f, [11, 12, 23, 24])).map((f) => {
      const s = [(px(f, 11)[0] + px(f, 12)[0]) / 2, (px(f, 11)[1] + px(f, 12)[1]) / 2];
      const h = [(px(f, 23)[0] + px(f, 24)[0]) / 2, (px(f, 23)[1] + px(f, 24)[1]) / 2];
      return Math.atan2(dir * (s[0] - h[0]), h[1] - s[1]) * 180 / Math.PI;
    });
    out.lean = avg(lean);
  }

  // 步伐事件：每腳「踝在髖前方」最大值 = 腳跟著地
  const steps = [];
  if (side) for (const leg of [0, 1]) {
    const f = frames.map((fr) => (ok(fr, [L.hip[leg], L.ank[leg]]) ? dir * (fr.lm[L.ank[leg]][0] - fr.lm[L.hip[leg]][0]) * W : null));
    const s = smooth(f);
    let last = -1e9;
    for (let i = 1; i < s.length - 1; i++) {
      if (s[i] == null || s[i - 1] == null || s[i + 1] == null) continue;
      if (s[i] > s[i - 1] && s[i] >= s[i + 1] && s[i] > body * 0.04 && frames[i].t - last > 0.25 * slow) {
        last = frames[i].t;
        const fr = frames[i];
        const kneeC = ok(fr, [L.hip[leg], L.knee[leg], L.ank[leg]]) ? angle(px(fr, L.hip[leg]), px(fr, L.knee[leg]), px(fr, L.ank[leg])) : null;
        // 垂直支撐：之後第一次踝回到髖正下方
        let j = i + 1; while (j < s.length && s[j] != null && s[j] > 0) j++;
        let kneeV = null, jv = null;
        if (j < s.length && ok(frames[j], [L.hip[leg], L.knee[leg], L.ank[leg]])) {
          jv = j; kneeV = angle(px(frames[j], L.hip[leg]), px(frames[j], L.knee[leg]), px(frames[j], L.ank[leg]));
        }
        steps.push({ leg: leg === 0 ? "左" : "右", i, iv: jv, t: fr.t / slow, kneeContact: kneeC, kneeVertical: kneeV });
      }
    }
  }
  steps.sort((a, b) => a.i - b.i);
  steps.forEach((s) => { const k = s.kneeVertical; s.status = k == null ? "na" : k >= 172 ? "ok" : k >= 165 ? "watch" : "flag"; });
  out.steps = steps;
  const kv = steps.map((s) => s.kneeVertical).filter((x) => x != null);
  out.kneeVAvg = avg(kv); out.kneeVMin = kv.length ? Math.min(...kv) : null;
  out.kneeBent = steps.filter((s) => s.status === "flag").length;
  out.kneeWatch = steps.filter((s) => s.status === "watch").length;

  // 步頻（需確認時間）
  if (side && confirmed && steps.length >= 3) {
    const span = (steps[steps.length - 1].t - steps[0].t);
    if (span > 0) { out.cadence = (steps.length - 1) / span * 60; out.stepTime = span / (steps.length - 1) * 1000; }
  }

  // 疑似騰空：兩腳最低點同時離開地面基準
  if (side) {
    const low = frames.map((f) => (ok(f, [29, 30, 31, 32]) ? Math.max(...[29, 30, 31, 32].map((i) => f.lm[i][1] * H)) : null));
    const valid = low.filter((x) => x != null).sort((a, b) => a - b);
    if (valid.length > 8) {
      const base = valid[Math.floor(valid.length * 0.85)];
      const thr = body * 0.035;
      frames.forEach((f, i) => { if (low[i] != null && base - low[i] > thr) out.flags.push(i); });
      // 要求連續 2 幀以上才計
      out.flags = out.flags.filter((i, k, a) => a[k - 1] === i - 1 || a[k + 1] === i + 1);
    }
    out.flightFrames = out.flags.length;
  } else {
    // 正面／後面：髖線傾斜
    const tilt = frames.filter((f) => ok(f, [23, 24])).map((f) => Math.abs(Math.atan2(px(f, 24)[1] - px(f, 23)[1], px(f, 24)[0] - px(f, 23)[0]) * 180 / Math.PI));
    out.hipTilt = tilt.length ? Math.max(...tilt) - Math.min(...tilt) : null;
    out.notes.push("正面／後面視角無法判斷膝伸直與步頻；請搭配側面影片。");
  }
  if (!confirmed) out.notes.push("未勾選「已確認原始 fps 與慢放倍率」，未計算步頻與毫秒。");
  if (detected < frames.length * 0.8) out.notes.push("有超過 20% 的幀偵測不到人體，結果可信度低；請改善光線、距離或背景。");
  if (side && steps.length < 4) out.notes.push("偵測到的步數偏少，請確認行進方向設定與影片是否包含足夠步伐。");
  return out;
}

// ---------- 繪製與複查 ----------
function initControls() {
  $("controls").hidden = false;
  $("scrub").max = state.frames.length - 1; $("scrub").value = 0; goto(0);
}
async function goto(i) {
  i = Math.max(0, Math.min(state.frames.length - 1, i)); state.idx = i; $("scrub").value = i;
  await seek($("video"), state.frames[i].t); drawCurrent();
}
$("scrub").oninput = (e) => goto(+e.target.value);
$("prev").onclick = () => goto(state.idx - 1);
$("next").onclick = () => goto(state.idx + 1);

function drawCurrent() {
  const c = $("overlay"), ctx = c.getContext("2d"); ctx.clearRect(0, 0, c.width, c.height);
  const f = state.frames[state.idx];
  if (!f) return;
  $("frameInfo").textContent = `第 ${state.idx + 1}/${state.frames.length} 幀`;
  if (!f.lm) return;
  const W = c.width, H = c.height, lw = Math.max(2, W / 400);
  const P = (i) => [f.lm[i][0] * W, f.lm[i][1] * H];
  const flying = state.analysis && state.analysis.flags.includes(state.idx);
  const near = state.analysis && state.analysis.steps.find((s) => s.i === state.idx || s.iv === state.idx);
  ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.font = `${Math.round(W / 40)}px system-ui`;
  if (state.mode === "analysis") {
    ctx.strokeStyle = "#2fc29c";
    BONES.forEach(([a, b]) => { if (f.lm[a][2] > 0.4 && f.lm[b][2] > 0.4) { ctx.beginPath(); ctx.moveTo(...P(a)); ctx.lineTo(...P(b)); ctx.stroke(); } });
    ctx.fillStyle = "#fff"; f.lm.forEach((q, i) => { if (i > 10 && q[2] > 0.4) { ctx.beginPath(); ctx.arc(q[0] * W, q[1] * H, lw * 1.6, 0, 7); ctx.fill(); } });
  } else { // Judge View：只看下肢，膝角直接標示
    for (const leg of [0, 1]) {
      const ids = [L.hip[leg], L.knee[leg], L.ank[leg]];
      if (!ids.every((i) => f.lm[i][2] > 0.4)) continue;
      const k = angle(P(ids[0]), P(ids[1]), P(ids[2]));
      ctx.strokeStyle = k >= 172 ? "#35d07f" : k >= 165 ? "#f0a500" : "#ff5a45";
      ctx.lineWidth = lw * 1.8; ctx.beginPath(); ctx.moveTo(...P(ids[0])); ctx.lineTo(...P(ids[1])); ctx.lineTo(...P(ids[2])); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.fillText(Math.round(k) + "°", P(ids[1])[0] + lw * 4, P(ids[1])[1]);
    }
  }
  if (near) { ctx.fillStyle = "#fff"; ctx.fillText(near.i === state.idx ? `${near.leg}腳著地` : `${near.leg}腳垂直・膝 ${near.kneeVertical ? Math.round(near.kneeVertical) + "°" : "—"}`, 12, H * 0.07); }
  if (flying) { ctx.fillStyle = "#ff5a45"; ctx.fillText("疑似兩腳離地", 12, H * 0.13); }
}

function buildChips() {
  const a = state.analysis, box = $("keyChips"); box.innerHTML = "";
  a.steps.forEach((s, n) => {
    const b = document.createElement("button");
    b.className = "chip " + s.status;
    b.textContent = `#${n + 1} ${s.leg}腳 膝${s.kneeVertical ? Math.round(s.kneeVertical) + "°" : "—"}`;
    b.onclick = () => goto(s.iv ?? s.i);
    box.appendChild(b);
  });
}

// ---------- 關鍵幀縮圖 ----------
async function captureKeyFrames() {
  const a = state.analysis, v = $("video"); const picks = [];
  const flagged = a.steps.filter((s) => s.status === "flag" && s.iv != null).sort((x, y) => x.kneeVertical - y.kneeVertical).slice(0, 3);
  flagged.forEach((s) => picks.push({ idx: s.iv, label: `${s.leg}腳垂直・膝 ${Math.round(s.kneeVertical)}°（需複查）` }));
  const good = a.steps.filter((s) => s.status === "ok" && s.iv != null).sort((x, y) => y.kneeVertical - x.kneeVertical)[0];
  if (good) picks.push({ idx: good.iv, label: `${good.leg}腳垂直・膝 ${Math.round(good.kneeVertical)}°（最佳）` });
  a.flags.slice(0, 2).forEach((i) => picks.push({ idx: i, label: "疑似兩腳離地" }));
  const cv = document.createElement("canvas"), sc = 320 / v.videoWidth; cv.width = 320; cv.height = Math.round(v.videoHeight * sc);
  a.keyframes = [];
  const prevMode = state.mode; state.mode = "judge";
  for (const p of picks) {
    state.idx = p.idx; await seek(v, state.frames[p.idx].t); drawCurrent();
    const g = cv.getContext("2d"); g.drawImage(v, 0, 0, cv.width, cv.height); g.drawImage($("overlay"), 0, 0, cv.width, cv.height);
    a.keyframes.push({ label: p.label, img: cv.toDataURL("image/jpeg", 0.6) });
  }
  state.mode = prevMode; await goto(0);
}

// ---------- 報告 ----------
function metaOf() {
  return { athlete: $("fAthlete").value.trim() || "選手", date: $("fDate").value, view: $("fView").value, dir: $("fDir").value, speed: $("fSpeed").value, pace: $("fPace").value.trim(), body: $("fBody").value, fps: +$("fFps").value, slow: +$("fSlow").value, confirmed: $("fConfirm").checked, file: state.file ? state.file.name : "" };
}
function buildRecord() {
  const a = state.analysis;
  return { id: state.record?.id || "r" + Date.now(), meta: metaOf(), summary: { steps: a.steps.length, detected: a.detected, kneeVAvg: a.kneeVAvg, kneeVMin: a.kneeVMin, kneeBent: a.kneeBent, kneeWatch: a.kneeWatch, flight: a.flightFrames ?? null, cadence: a.cadence ?? null, stepTime: a.stepTime ?? null, lean: a.lean ?? null, hipTilt: a.hipTilt ?? null }, steps: a.steps.map(({ leg, t, kneeContact, kneeVertical, status }) => ({ leg, t, kneeContact, kneeVertical, status })), notes: a.notes, keyframes: a.keyframes || [] };
}
const fmt = (x, d = 0, u = "") => (x == null ? "—" : x.toFixed(d) + u);
function metric(label, val, cls = "", sub = "") { return `<div class="metric ${cls}"><small>${label}</small><b>${val}</b>${sub ? `<small>${sub}</small>` : ""}</div>`; }

function reportHTML(rec) {
  const m = rec.meta, s = rec.summary, side = m.view.startsWith("side");
  const kcls = s.kneeBent ? "flag" : s.kneeWatch ? "watch" : s.kneeVMin == null ? "na" : "ok";
  let h = `<div class="card"><div class="section-head"><div><h2>${esc(m.athlete)} · ${esc(m.date)}</h2><p class="meta">${labels.view[m.view]} · ${labels.speed[m.speed]} · 配速 ${esc(m.pace || "未記錄")} · 身體狀況：${labels.body[m.body]}</p></div></div>`;
  if (m.body === "yes") h += `<p class="status err">已標記有不適或跛行：建議先暫停高強度訓練，並由教練／醫療人員評估。</p>`;
  h += `<div class="metrics">`;
  if (side) {
    h += metric("垂直時膝角（平均）", fmt(s.kneeVAvg, 0, "°"), kcls, `最小 ${fmt(s.kneeVMin, 0, "°")}（≥172° 視為伸直）`);
    h += metric("膝未伸直步數", `${s.kneeBent} 步`, s.kneeBent ? "flag" : "ok", `另有 ${s.kneeWatch} 步需留意`);
    h += metric("疑似兩腳離地幀", s.flight == null ? "—" : `${s.flight} 幀`, s.flight ? "watch" : "ok", "需高 fps 原片人工確認");
    h += metric("軀幹前傾", fmt(s.lean, 1, "°"), "", "正值＝朝行進方向前傾");
    h += metric("步頻", s.cadence ? fmt(s.cadence, 0, " 步/分") : "未計算", s.cadence ? "" : "na", s.stepTime ? `每步 ${fmt(s.stepTime, 0, " ms")}` : "需確認 fps 與慢放");
    h += metric("偵測步數", `${s.steps} 步`, "", `姿態偵測 ${s.detected} 幀`);
  } else h += metric("髖線傾斜變化", fmt(s.hipTilt, 1, "°"), "", "正／後視角僅提供此項");
  h += `</div>`;
  if (rec.steps.length) h += `<table><tr><th>#</th><th>腳</th><th>時間(s)</th><th>著地膝角</th><th>垂直膝角</th><th>狀態</th></tr>${rec.steps.map((x, i) => `<tr><td>${i + 1}</td><td>${x.leg}</td><td>${fmt(x.t, 2)}</td><td>${fmt(x.kneeContact, 0, "°")}</td><td>${fmt(x.kneeVertical, 0, "°")}</td><td>${{ ok: "伸直", watch: "留意", flag: "疑似彎曲", na: "—" }[x.status]}</td></tr>`).join("")}</table>`;
  h += `</div>`;
  if (rec.keyframes.length) h += `<div class="card"><h2>關鍵幀</h2><div class="thumbs">${rec.keyframes.map((k) => `<figure><img src="${k.img}" alt=""><figcaption>${esc(k.label)}</figcaption></figure>`).join("")}</div></div>`;
  h += `<div class="card"><h2>給教練複查</h2><ul class="notes">${[...rec.notes, "以上為姿態估計篩查，不是正式裁判判決。請回到原片逐幀確認。", "先和自己的 Easy 基準比較，再決定下一個要修的單一動作。"].map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>`;
  return h;
}
function renderReport() {
  const el = $("tab-report");
  if (!state.analysis) return (el.innerHTML = `<div class="card empty">尚無分析。請先在「分析工作台」匯入影片並分析。</div>`);
  el.innerHTML = reportHTML(buildRecord());
}

// ---------- 儲存／歷史 ----------
$("btnSave").onclick = () => {
  if (!state.analysis) return;
  const rec = buildRecord(), all = loadRecords(), i = all.findIndex((r) => r.id === rec.id);
  if (i >= 0) all[i] = rec; else all.unshift(rec);
  state.record = rec;
  if (!saveRecords(all)) { // 空間不足就砍縮圖再試
    rec.keyframes = []; if (!saveRecords(all)) return status("儲存失敗：瀏覽器空間不足，請先匯出舊紀錄。", true);
    status("空間不足，已儲存但省略關鍵幀縮圖。");
  } else status("已儲存。");
  $("saveMeta").textContent = "已儲存 " + new Date().toLocaleTimeString();
};
function renderHistory() {
  const el = $("tab-history"), all = loadRecords();
  if (!all.length) return (el.innerHTML = `<div class="card empty">還沒有訓練紀錄。</div>`);
  el.innerHTML = `<div class="card"><div class="section-head"><h2>訓練紀錄（${all.length}）</h2><button class="btn sm" id="btnExport">匯出 JSON</button></div>
  <table><tr><th>日期</th><th>視角</th><th>組別</th><th>配速</th><th>垂直膝角</th><th>未伸直</th><th>步頻</th><th></th></tr>${all.map((r) => `<tr><td>${esc(r.meta.date)}</td><td>${labels.view[r.meta.view] || ""}</td><td>${labels.speed[r.meta.speed] || ""}</td><td>${esc(r.meta.pace || "—")}</td><td>${fmt(r.summary.kneeVAvg, 0, "°")}</td><td>${r.summary.kneeBent ?? "—"}</td><td>${fmt(r.summary.cadence, 0)}</td><td><button class="btn sm" data-view="${r.id}">看報告</button> <button class="btn sm" data-del="${r.id}">刪除</button></td></tr>`).join("")}</table></div><div id="histReport"></div>`;
  $("btnExport").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(all, null, 1)], { type: "application/json" })); a.download = "racewalk-records.json"; a.click(); };
  el.querySelectorAll("[data-view]").forEach((b) => b.onclick = () => { $("histReport").innerHTML = reportHTML(all.find((r) => r.id === b.dataset.view)); });
  el.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => { if (confirm("刪除這筆紀錄？")) { saveRecords(all.filter((r) => r.id !== b.dataset.del)); renderHistory(); } });
}
$("btnImport").onclick = () => $("jsonInput").click();
$("jsonInput").onchange = async (e) => {
  try {
    const data = JSON.parse(await e.target.files[0].text());
    const incoming = (Array.isArray(data) ? data : [data]).filter((r) => r && r.meta && r.summary);
    const all = loadRecords(), ids = new Set(all.map((r) => r.id));
    incoming.forEach((r) => { if (!ids.has(r.id)) all.push(r); });
    saveRecords(all); setTab("history"); status(`已匯入 ${incoming.length} 筆。`);
  } catch { status("匯入失敗：不是有效的紀錄 JSON。", true); }
  e.target.value = "";
};
