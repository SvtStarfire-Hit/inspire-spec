/* InspireSpec 页面端 · 交互脚本
 * 零框架、零构建；数据与 MCP 端同源（data/*.js，ESM 直接加载）。
 * 职责：hash 路由 / 渲染视图 / 一键复制 / 场景选择。 */
import { stages } from "../../data/stages.js";
import { scenes } from "../../data/scenes.js";

const view = document.getElementById("view");
const sceneSelect = document.getElementById("scene");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* 场景覆盖合并 */
function contractOf(stage) {
  const sceneId = sceneSelect.value;
  if (!sceneId) return { ...stage };
  const scene = scenes.find((s) => s.id === sceneId);
  if (!scene) return { ...stage };
  const override = scene.stageOverrides?.[stage.id] ?? {};
  return { ...stage, ...override };
}

/* 初始化场景下拉 */
scenes.forEach((s) => {
  const opt = document.createElement("option");
  opt.value = s.id;
  opt.textContent = s.name;
  sceneSelect.appendChild(opt);
});
sceneSelect.addEventListener("change", () => render());

/* 一键复制 */
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { /* 降级 */ }
  const ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { /* 忽略 */ }
  ta.remove();
  return ok;
}
function flashCopied(btn) {
  if (btn.dataset.original == null) btn.dataset.original = btn.innerHTML;
  btn.classList.add("copied");
  btn.innerHTML = "<span>✓ 已复制</span>";
  clearTimeout(btn._t);
  btn._t = setTimeout(() => { btn.classList.remove("copied"); btn.innerHTML = btn.dataset.original; }, 1400);
}
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-copy], [data-copy-el]");
  if (!btn) return;
  let text = btn.dataset.copy ?? "";
  if (btn.dataset.copyEl) text = document.querySelector(btn.dataset.copyEl)?.textContent ?? "";
  if (await copyText(text)) flashCopied(btn);
});

/* 渲染片段 */
function codeblock(label, text) {
  const id = `cb-${Math.random().toString(36).slice(2, 8)}`;
  return `<div class="codeblock">
    <div class="codeblock-head">
      <span class="codeblock-label">${esc(label)}</span>
      <button class="btn-copy" type="button" data-copy-el="#${id}"><span>复制</span></button>
    </div>
    <pre><code id="${id}">${esc(text)}</code></pre>
  </div>`;
}

function tagList(items, cls = "") {
  return `<div class="tag-list">${items.map((t) => `<span class="tag ${cls}">${esc(t)}</span>`).join("")}</div>`;
}

/* 总览视图 */
function renderOverview() {
  const letters = ["A", "B", "C", "D", "E", "F", "G"];
  const cards = stages.map((s, i) => `
    <div class="stage-card" onclick="location.hash='#stage/${s.id}'">
      <div><span class="stage-num">${letters[i]}</span><span class="stage-name">${esc(s.name)}</span></div>
      <div class="stage-goal">${esc(s.goal)}</div>
    </div>
  `).join("");

  view.innerHTML = `
    <h2 style="font-size:var(--f-xl);margin-bottom:var(--s-xs)">流程全景</h2>
    <p style="color:var(--c-text-secondary)">7 个阶段，每个阶段产出双轨文档：A 系列（人读工程文档）+ B 系列（AI 用约束壳：边界约束 / 验收用例 / 接口签名）。</p>
    <div class="stage-grid">${cards}</div>
    <div class="section" style="margin-top:var(--s-2xl)">
      <div class="section-title">场景扩展</div>
      <p style="font-size:var(--f-sm);color:var(--c-text-secondary);margin-top:var(--s-sm)">
        不同项目类型可在通用阶段基础上叠加专属约束。在右上角选择场景后，点击查看各阶段的差异。
      </p>
      <div style="margin-top:var(--s-md)">
        ${scenes.map((s) => `<span class="tag" style="font-size:var(--f-sm);padding:4px 12px">${esc(s.name)} — ${esc(s.description)}</span>`).join(" ")}
      </div>
    </div>
  `;
}

/* 详情视图 */
let currentTab = "a"; // "a" | "b"

function renderDetail(stageId) {
  const stage = stages.find((s) => s.id === stageId);
  if (!stage) { renderOverview(); return; }
  const c = contractOf(stage);
  const sceneId = sceneSelect.value;
  const scene = sceneId ? scenes.find((s) => s.id === sceneId) : null;
  const hasOverride = scene?.stageOverrides?.[stageId] != null;

  const letters = ["A", "B", "C", "D", "E", "F", "G"];
  const letter = letters[stage.number] ?? "";

  const tabBtn = (id, label) => `<button class="tab-btn ${currentTab === id ? "active" : ""}" data-tab="${id}">${label}</button>`;

  view.innerHTML = `
    <a class="back-link" href="#">← 返回流程全景</a>
    <div class="detail">
      <h2><span class="stage-num" style="font-size:var(--f-md)">${letter}</span> ${esc(c.name)}</h2>
      <p class="goal">${esc(c.goal)}</p>
      ${hasOverride ? `<p style="font-size:var(--f-xs);color:var(--c-primary);background:var(--c-primary-light);padding:4px 8px;border-radius:var(--r-sm);display:inline-block">已应用「${esc(scene.name)}」场景覆盖</p>` : ""}

      <div class="tab-bar">
        ${tabBtn("a", "A 系列 · 人读")}
        ${tabBtn("b", "B 系列 · AI 用")}
        ${tabBtn("common", "通用")}
      </div>

      <div id="tab-a" class="tab-panel" style="display:${currentTab === "a" ? "block" : "none"}">
        <div class="section">
          <div class="section-title">A 系列产物（工程文档）</div>
          <ul class="field-list">
            ${(c.aDeliverables || []).map((d) => `<li><span class="field-name">${esc(d.name)}</span><span class="field-desc">${esc(d.description)}</span></li>`).join("")}
          </ul>
        </div>
        <div class="section">
          <div class="section-title">流程建议</div>
          <ol style="font-size:var(--f-sm);padding-left:var(--s-lg)">
            ${(c.aGuidance || []).map((g) => `<li style="margin-bottom:var(--s-xs)">${esc(g)}</li>`).join("")}
          </ol>
        </div>
      </div>

      <div id="tab-b" class="tab-panel" style="display:${currentTab === "b" ? "block" : "none"}">
        <div class="section">
          <div class="section-title">B 系列产物（约束壳）</div>
          <ul class="field-list">
            ${(c.bDeliverables || []).map((d) => `<li><span class="field-name">${esc(d.name)}</span><span class="field-desc">${esc(d.description)}</span></li>`).join("")}
          </ul>
        </div>
        <div class="section">
          <div class="section-title">边界约束</div>
          ${tagList(c.boundaryConstraints || [], "rule")}
        </div>
        <div class="section">
          <div class="section-title">验收用例</div>
          <div class="acceptance-list">
            ${(c.acceptanceCriteria || []).map((a) => `
              <div class="acceptance-item">
                <strong>${esc(a.scenario)}</strong>
                <div class="acceptance-detail">Given ${esc(a.given)} → When ${esc(a.when)} → Then ${esc(a.then)}</div>
              </div>
            `).join("")}
          </div>
        </div>
        ${c.interfaceSignatures?.length ? `<div class="section">
          <div class="section-title">接口签名</div>
          ${codeblock("接口规格", JSON.stringify(c.interfaceSignatures, null, 2))}
        </div>` : ""}
      </div>

      <div id="tab-common" class="tab-panel" style="display:${currentTab === "common" ? "block" : "none"}">
        <div class="section">
          <div class="section-title">出口条件</div>
          <ul class="field-list">
            ${c.exitCriteria.map((e) => `<li>${esc(e)}</li>`).join("")}
          </ul>
        </div>
        <div class="section">
          <div class="section-title">规则</div>
          ${tagList(c.rules, "rule")}
        </div>
        <div class="section">
          <div class="section-title">常见坑</div>
          ${tagList(c.pitfalls, "pitfall")}
        </div>
        <div class="section">
          <div class="section-title">回退影响面</div>
          <ul class="field-list">
            ${c.revisionImpact.map((r) => `<li>${esc(r)}</li>`).join("")}
          </ul>
        </div>
        <div class="section">
          <div class="section-title">门禁清单</div>
          ${tagList(c.checklist, "check")}
        </div>
        <div class="section">
          <div class="section-title">人确认点</div>
          <p style="font-size:var(--f-sm)">${esc(c.humanCheckpoint)}</p>
        </div>
        <div class="section">
          <div class="section-title">前置依赖</div>
          <div class="dep-list">
            ${c.dependencies.map((d) => `<div class="dep-item"><strong>${esc(d.deliverable)}</strong> ${d.hint ? `<span class="dep-hint">— ${esc(d.hint)}</span>` : ""}</div>`).join("")}
          </div>
        </div>
      </div>
    </div>
  `;

  // tab 切换
  view.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentTab = btn.dataset.tab;
      view.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === currentTab));
      view.querySelectorAll(".tab-panel").forEach((p) => p.style.display = "none");
      document.getElementById(`tab-${currentTab}`).style.display = "block";
    });
  });
}

/* 路由 */
function render() {
  const hash = location.hash.replace("#", "");
  if (hash.startsWith("stage/")) {
    renderDetail(hash.replace("stage/", ""));
  } else {
    renderOverview();
  }
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", render);
render();
