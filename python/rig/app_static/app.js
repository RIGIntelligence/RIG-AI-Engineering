const state = {
  fixedPrompt: "",
  sources: [],
  contract: null,
  mode: "auto",
  enhancements: [],
  catalog: null,
  envelope: null,
  view: "fixed",
  commands: {
    data: null,
    view: "top",
    filter: "all",
    query: "",
    selectedKey: "",
  },
};

const $ = (id) => document.getElementById(id);

const els = {
  healthPill: $("healthPill"),
  auditPill: $("auditPill"),
  promptFile: $("promptFile"),
  fileName: $("fileName"),
  promptInput: $("promptInput"),
  modeSelect: $("modeSelect"),
  screenshotNoteInput: $("screenshotNoteInput"),
  enhancementGrid: $("enhancementGrid"),
  cwdInput: $("cwdInput"),
  limitInput: $("limitInput"),
  contextPackToggle: $("contextPackToggle"),
  apisToggle: $("apisToggle"),
  fixButton: $("fixButton"),
  clearButton: $("clearButton"),
  loadContextButton: $("loadContextButton"),
  fixedOutput: $("fixedOutput"),
  contractOutput: $("contractOutput"),
  envelopeOutput: $("envelopeOutput"),
  proofOutput: $("proofOutput"),
  proofPath: $("proofPath"),
  proofPreview: $("proofPreview"),
  copyButton: $("copyButton"),
  downloadButton: $("downloadButton"),
  proofButton: $("proofButton"),
  contextList: $("contextList"),
  gateList: $("gateList"),
  resourceSearch: $("resourceSearch"),
  resourceList: $("resourceList"),
  questionSearch: $("questionSearch"),
  personaSelect: $("personaSelect"),
  questionList: $("questionList"),
  browserUrl: $("browserUrl"),
  browserTask: $("browserTask"),
  browserButton: $("browserButton"),
  commandSourceDate: $("commandSourceDate"),
  metricTop: $("metricTop"),
  metricNext: $("metricNext"),
  metricRaw: $("metricRaw"),
  commandSearch: $("commandSearch"),
  commandResults: $("commandResults"),
  commandResultCount: $("commandResultCount"),
  commandActiveView: $("commandActiveView"),
  detailTier: $("detailTier"),
  detailCommand: $("detailCommand"),
  detailMeaning: $("detailMeaning"),
  detailCombines: $("detailCombines"),
  detailRoute: $("detailRoute"),
  detailSafety: $("detailSafety"),
  detailSource: $("detailSource"),
  detailPath: $("detailPath"),
  copyCommand: $("copyCommand"),
  toast: $("toast"),
};

const commandViewLabels = {
  top: "Top 20",
  next: "Next 20",
  aider: "Aider",
  cline: "Cline",
  hermes: "Hermes",
  pi: "Pi",
  codex: "Codex",
  claude: "Claude",
  github: "GitHub",
  merge: "Merge Map",
  all: "Full Search",
  sources: "Sources",
};

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 2600);
}

function setBusy(button, isBusy, label) {
  if (!button) return;
  if (isBusy) {
    button.dataset.originalText = button.textContent;
    button.textContent = label;
    button.disabled = true;
    return;
  }
  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok || payload.status === "error") {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function text(value, fallback = "-") {
  const cleaned = String(value ?? "").trim();
  return cleaned || fallback;
}

function statusClass(status) {
  const value = String(status || "").toLowerCase();
  if (["ok", "pass", "available", "configured"].some((word) => value.includes(word))) return "ok";
  if (["missing", "unavailable", "not configured", "error", "fail"].some((word) => value.includes(word))) return "fail";
  return "warn";
}

async function loadHealth() {
  try {
    const health = await api("/api/health");
    els.healthPill.textContent = `API ${health.version}`;
    els.healthPill.className = "lozenge success";
    els.auditPill.textContent = `Catalog ${health.catalog_status}`;
    els.auditPill.className = `lozenge ${health.catalog_status === "PASS" ? "success" : "warn"}`;
  } catch (error) {
    els.healthPill.textContent = "API offline";
    els.healthPill.className = "lozenge warn";
    showToast(error.message);
  }
}

async function loadAudit() {
  try {
    const audit = await api("/api/v15/audit");
    const counts = audit.counts || {};
    const expected = audit.expected_counts || {};
    els.auditPill.textContent = `${counts.resources || 0}/${expected.resources || 0} repos, ${counts.questions || 0} questions`;
    els.auditPill.className = `lozenge ${audit.status === "PASS" ? "success" : "warn"}`;
  } catch (error) {
    els.auditPill.textContent = "Catalog issue";
    els.auditPill.className = "lozenge warn";
  }
}

function selectedEnhancements() {
  return Array.from(els.enhancementGrid.querySelectorAll("input[type='checkbox']:checked")).map((input) => input.value);
}

function defaultEnhancementsForMode(mode) {
  const defaults = state.catalog?.default_mode_enhancements || {};
  const selectedMode = mode === "auto" ? "general" : mode;
  return defaults[selectedMode] || defaults.general || [];
}

function renderEnhancements() {
  const packs = state.catalog?.enhancement_packs || [];
  const defaults = new Set(defaultEnhancementsForMode(els.modeSelect.value));
  if (!packs.length) {
    els.enhancementGrid.innerHTML = '<label><input type="checkbox" value="rigforge-contract" checked><span>RigForge DoneContract</span></label>';
    return;
  }
  els.enhancementGrid.innerHTML = packs.map((pack) => `
    <label title="${escapeHtml(pack.description || "")}">
      <input type="checkbox" value="${escapeHtml(pack.id)}" ${defaults.has(pack.id) ? "checked" : ""}>
      <span>${escapeHtml(pack.label || pack.id)}</span>
    </label>
  `).join("");
}

async function loadPromptMasterCatalog() {
  try {
    const payload = await api("/api/prompt-master/enhancements");
    state.catalog = payload;
    renderEnhancements();
  } catch (error) {
    state.catalog = null;
    renderEnhancements();
    showToast(error.message);
  }
}

async function refreshContext(includeApis = false, includeContextPack = false) {
  setBusy(els.loadContextButton, true, "Checking");
  els.contextList.innerHTML = '<div class="context-item warn"><h3>Checking context</h3><p>Reading local adapters.</p></div>';
  try {
    const payload = await api("/api/context-status", {
      method: "POST",
      body: JSON.stringify({
        prompt: els.promptInput.value || "RIG Prompt Master context status",
        cwd: els.cwdInput.value,
        include_apis: includeApis,
        include_context_pack: includeContextPack,
        limit: Number(els.limitInput.value || 5),
      }),
    });
    renderContext(payload.sources || []);
  } catch (error) {
    els.contextList.innerHTML = `<div class="context-item fail"><h3>Context check failed</h3><p>${escapeHtml(error.message)}</p></div>`;
  } finally {
    setBusy(els.loadContextButton, false);
  }
}

function renderContext(sources) {
  if (!sources.length) {
    els.contextList.innerHTML = '<div class="context-item warn"><h3>No sources returned</h3><p>The API is reachable, but no context adapters produced output.</p></div>';
    return;
  }
  els.contextList.innerHTML = sources.map((source) => {
    const klass = statusClass(source.status);
    return `
      <article class="context-item ${klass}">
        <h3>${escapeHtml(source.name || "source")}</h3>
        <p><strong>${escapeHtml(source.status || "unknown")}</strong> - ${escapeHtml(source.summary || "")}</p>
      </article>
    `;
  }).join("");
}

async function loadGates() {
  const payload = await api("/api/v15/gates");
  els.gateList.innerHTML = (payload.gates || []).map((gate) => `
    <label class="gate-item">
      <input type="checkbox">
      <p><strong>Gate ${escapeHtml(gate.id)}</strong>: ${escapeHtml(gate.description)}</p>
    </label>
  `).join("");
}

async function loadResources() {
  const query = encodeURIComponent(els.resourceSearch.value.trim());
  const payload = await api(`/api/v15/resources?q=${query}&limit=50`);
  els.resourceList.innerHTML = (payload.resources || []).map((resource) => `
    <article class="resource-card">
      <h3><a href="${escapeHtml(resource.repo)}" target="_blank" rel="noreferrer">${escapeHtml(resource.name || resource.id)}</a></h3>
      <p>${escapeHtml(resource.role_in_rig || "")}</p>
      <div class="meta-row">
        <span class="tag blue">${escapeHtml(resource.class || "resource")}</span>
        <span class="tag amber">${escapeHtml(resource.license || "license review")}</span>
        <span class="tag">${escapeHtml(resource.load_when || "load when relevant")}</span>
      </div>
    </article>
  `).join("");
}

async function loadQuestions() {
  const query = encodeURIComponent(els.questionSearch.value.trim());
  const persona = encodeURIComponent(els.personaSelect.value);
  const payload = await api(`/api/v15/questions?q=${query}&persona=${persona}&limit=100`);
  if (els.personaSelect.options.length <= 1) {
    (payload.personas || []).forEach((personaItem) => {
      const option = document.createElement("option");
      option.value = personaItem.id;
      option.textContent = personaItem.display_name || personaItem.name || personaItem.id;
      els.personaSelect.appendChild(option);
    });
  }
  els.questionList.innerHTML = (payload.questions || []).map((question) => `
    <article class="question-card">
      <h3>${escapeHtml(question.id)}: ${escapeHtml(question.question)}</h3>
      <p>${escapeHtml(question.evidence || "")}</p>
      <div class="meta-row"><span class="tag">${escapeHtml(question.persona_id || question.persona || "persona")}</span></div>
    </article>
  `).join("");
}

function currentPayload() {
  return {
    prompt: els.promptInput.value,
    mode: els.modeSelect.value,
    enhancements: selectedEnhancements(),
    screenshot_note: els.screenshotNoteInput.value,
    cwd: els.cwdInput.value,
    include_context_pack: els.contextPackToggle.checked,
    include_apis: els.apisToggle.checked,
    limit: Number(els.limitInput.value || 5),
  };
}

async function fixPrompt() {
  const prompt = els.promptInput.value.trim();
  if (!prompt) {
    showToast("Paste or upload a prompt first.");
    return;
  }
  setBusy(els.fixButton, true, "Fixing");
  els.fixedOutput.value = "RIG is gathering context and repairing the prompt...";
  try {
    const payload = await api("/api/fix-prompt", {
      method: "POST",
      body: JSON.stringify(currentPayload()),
    });
    state.fixedPrompt = payload.fixed_prompt || "";
    state.sources = payload.sources || [];
    state.contract = payload.contract || null;
    state.mode = payload.mode || els.modeSelect.value;
    state.enhancements = payload.enhancements || selectedEnhancements();
    els.fixedOutput.value = state.fixedPrompt;
    els.contractOutput.textContent = JSON.stringify(state.contract || {}, null, 2);
    renderContext(state.sources);
    showView("fixed");
    showToast("Prompt fixed.");
  } catch (error) {
    els.fixedOutput.value = "";
    showToast(error.message);
  } finally {
    setBusy(els.fixButton, false);
  }
}

function showView(view) {
  state.view = view;
  document.querySelectorAll(".output-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === view);
  });
  els.fixedOutput.classList.toggle("hidden", view !== "fixed");
  els.contractOutput.classList.toggle("hidden", view !== "contract");
  els.envelopeOutput.classList.toggle("hidden", view !== "envelope");
  els.proofOutput.classList.toggle("hidden", view !== "proof");
}

async function createBrowserEnvelope() {
  const task = els.browserTask.value.trim();
  if (!task) {
    showToast("Describe the browser task first.");
    return;
  }
  setBusy(els.browserButton, true, "Creating");
  try {
    const payload = await api("/api/browser-envelope", {
      method: "POST",
      body: JSON.stringify({
        task,
        url: els.browserUrl.value,
        title: "RIG browser-agent harness task",
      }),
    });
    state.envelope = payload.envelope;
    els.envelopeOutput.textContent = JSON.stringify(payload.envelope, null, 2);
    showView("envelope");
    document.querySelector("#workbench")?.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast("Dry-run envelope created.");
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(els.browserButton, false);
  }
}

async function createProofPacket() {
  const fixedPrompt = state.fixedPrompt || els.fixedOutput.value;
  if (!fixedPrompt.trim()) {
    showToast("Fix a prompt before creating proof.");
    return;
  }
  setBusy(els.proofButton, true, "Saving");
  try {
    const payload = await api("/api/proofpacket", {
      method: "POST",
      body: JSON.stringify({
        title: "RIG Prompt Master prompt fix",
        task: els.promptInput.value,
        fixed_prompt: fixedPrompt,
        sources: state.sources,
        mode: state.mode,
        enhancements: state.enhancements,
        contract: state.contract,
      }),
    });
    els.proofPath.textContent = payload.path;
    els.proofPreview.textContent = `ProofPacket written:\n${payload.path}`;
    showView("proof");
    showToast("ProofPacket saved.");
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(els.proofButton, false);
  }
}

async function copyOutput() {
  const textToCopy = state.view === "contract"
    ? els.contractOutput.textContent
    : state.view === "envelope"
      ? els.envelopeOutput.textContent
      : state.view === "proof"
        ? els.proofPreview.textContent
        : els.fixedOutput.value;
  if (!textToCopy.trim()) {
    showToast("Nothing to copy yet.");
    return;
  }
  await navigator.clipboard.writeText(textToCopy);
  showToast("Copied.");
}

function downloadOutput() {
  const textToDownload = state.view === "contract"
    ? els.contractOutput.textContent
    : state.view === "envelope"
      ? els.envelopeOutput.textContent
      : state.view === "proof"
        ? els.proofPreview.textContent
        : els.fixedOutput.value;
  if (!textToDownload.trim()) {
    showToast("Nothing to download yet.");
    return;
  }
  const blob = new Blob([textToDownload], { type: "text/plain;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = state.view === "contract"
    ? "rig-prompt-master-contract.json"
    : state.view === "envelope"
      ? "rig-browser-envelope.json"
      : state.view === "proof"
        ? "rig-proofpacket.txt"
        : "rig-fixed-prompt.md";
  link.click();
  URL.revokeObjectURL(href);
}

function debounce(fn, delay = 250) {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

function rows(name) {
  return Array.isArray(state.commands.data?.[name]) ? state.commands.data[name] : [];
}

function commandItemKey(item) {
  return [item.kind, item.command, item.source, item.path, item.meaning].join("|");
}

function normalizeCommand(record, kind) {
  return {
    kind,
    tier: text(record.Tier || record.Surface || kind, kind),
    command: text(record.Command || record["Rebuild As"] || record.Repository || record.Surface),
    meaning: text(record.Meaning || record.Description || record.Assessment || record["Current Commands"]),
    combines: text(record.Combines || record.Aliases || record["Current Commands"] || record.Type),
    route: text(record.Route || record["Maps To"] || record.URL || record.Path),
    visibility: text(record.Visibility),
    safety: text(record.Safety || record.Notes),
    source: text(record.Source || record.Repository || record.Surface || kind),
    path: text(record["Source Path"] || record.Path || record.URL),
    search: Object.values(record).map((value) => String(value ?? "")).join(" ").toLowerCase(),
    raw: record,
  };
}

function dedupeCommands(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.command}::${item.source}::${item.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function allCommandItems() {
  if (!state.commands.data) return [];

  const top = rows("top20").map((row) => normalizeCommand(row, "top"));
  const next = rows("next20").map((row) => normalizeCommand(row, "next"));
  const aider = rows("aiderCommands").map((row) => normalizeCommand(row, "aider"));
  const cline = rows("clineCatalog").map((row) => normalizeCommand(row, "cline"));
  const github = rows("githubCatalog").map((row) => normalizeCommand(row, "github"));
  const merge = rows("mergeMatrix").map((row) => normalizeCommand(row, "merge"));
  const sources = [
    ...rows("localInventory").map((row) => normalizeCommand(row, "inventory")),
    ...rows("externalRepos").map((row) => normalizeCommand(row, "external")),
    ...rows("rawSources").map((row) => normalizeCommand(row, "source")),
  ];
  const curated = rows("searchCatalog").map((row) => normalizeCommand(row, "curated"));
  const raw = rows("rawCatalog").map((row) => normalizeCommand(row, "raw"));
  const bySurface = (surface) => raw.filter((item) => item.tier.toLowerCase().includes(surface));

  if (state.commands.view === "top") return top;
  if (state.commands.view === "next") return next;
  if (state.commands.view === "aider") return aider;
  if (state.commands.view === "cline") return dedupeCommands([...cline, ...bySurface("cline")]);
  if (state.commands.view === "hermes") return bySurface("hermes");
  if (state.commands.view === "pi") return bySurface("pi");
  if (state.commands.view === "codex") return bySurface("codex");
  if (state.commands.view === "claude") return bySurface("claude");
  if (state.commands.view === "github") return github;
  if (state.commands.view === "merge") return merge;
  if (state.commands.view === "sources") return sources;
  return dedupeCommands([...top, ...next, ...aider, ...cline, ...github, ...curated, ...raw, ...merge, ...sources]);
}

function applyCommandFilter(items) {
  let filtered = items;

  if (state.commands.filter !== "all") {
    filtered = filtered.filter((item) => {
      if (state.commands.filter === "github") return item.kind === "github" || item.tier.toLowerCase().includes("github");
      return item.kind === state.commands.filter || item.tier.toLowerCase().includes(state.commands.filter);
    });
  }

  const query = state.commands.query.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter((item) => [
      item.command,
      item.meaning,
      item.combines,
      item.route,
      item.safety,
      item.source,
      item.path,
      item.search,
    ].some((value) => value.toLowerCase().includes(query)));
  }

  return filtered;
}

function renderCommandRows(items) {
  els.commandResults.innerHTML = items.slice(0, 500).map((item) => {
    const key = commandItemKey(item);
    const selected = key === state.commands.selectedKey ? " is-selected" : "";
    return `
      <tr class="${selected}" data-key="${escapeHtml(key)}">
        <td class="command-cell">${escapeHtml(item.command)}</td>
        <td class="meaning-cell">${escapeHtml(item.meaning)}</td>
        <td>${escapeHtml(item.route)}</td>
        <td><span class="muted">${escapeHtml(item.source)}</span></td>
      </tr>
    `;
  }).join("") || `
    <tr>
      <td colspan="4" class="muted">No matching commands.</td>
    </tr>
  `;

  els.commandResults.querySelectorAll("tr[data-key]").forEach((row) => {
    row.addEventListener("click", () => {
      const item = items.find((candidate) => commandItemKey(candidate) === row.dataset.key);
      if (item) {
        state.commands.selectedKey = commandItemKey(item);
        renderCommands();
      }
    });
  });
}

function renderCommandDetail(item) {
  if (!item) {
    els.detailTier.textContent = "Pick a command";
    els.detailCommand.textContent = "Pick a command";
    els.detailMeaning.textContent = "-";
    els.detailCombines.textContent = "-";
    els.detailRoute.textContent = "-";
    els.detailSafety.textContent = "-";
    els.detailSource.textContent = "-";
    els.detailPath.textContent = "-";
    return;
  }
  els.detailTier.textContent = item.tier;
  els.detailCommand.textContent = item.command;
  els.detailMeaning.textContent = item.meaning;
  els.detailCombines.textContent = item.combines;
  els.detailRoute.textContent = item.route;
  els.detailSafety.textContent = item.safety;
  els.detailSource.textContent = item.source;
  els.detailPath.textContent = item.path;
}

function renderCommands() {
  if (!state.commands.data) return;
  const items = applyCommandFilter(allCommandItems());
  if (!state.commands.selectedKey && items.length) {
    state.commands.selectedKey = commandItemKey(items[0]);
  }
  const selectedItem = items.find((item) => commandItemKey(item) === state.commands.selectedKey) || items[0] || null;
  if (selectedItem) state.commands.selectedKey = commandItemKey(selectedItem);

  els.commandActiveView.textContent = commandViewLabels[state.commands.view] || "Commands";
  els.commandResultCount.textContent = `${items.length.toLocaleString()} result${items.length === 1 ? "" : "s"}`;
  renderCommandRows(items);
  renderCommandDetail(selectedItem);
}

function setCommandView(view) {
  state.commands.view = view;
  state.commands.selectedKey = "";
  document.querySelectorAll(".command-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.commandView === view);
  });
  renderCommands();
}

function setCommandFilter(filter) {
  state.commands.filter = filter;
  state.commands.selectedKey = "";
  document.querySelectorAll(".command-segment").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === filter);
  });
  renderCommands();
}

async function loadCommandSurface() {
  try {
    let response = await fetch("/api/command-surface/bootstrap", { cache: "no-store" });
    if (!response.ok) {
      response = await fetch("/commands.json", { cache: "no-store" });
    }
    state.commands.data = await response.json();
    const stats = state.commands.data.stats || {};
    els.metricTop.textContent = stats.top20 ?? "-";
    els.metricNext.textContent = stats.next20 ?? "-";
    els.metricRaw.textContent = Number(stats.rawCatalog || 0).toLocaleString();
    els.commandSourceDate.textContent = `Source: ${state.commands.data.sourceGeneratedAt?.rigWorkbook || state.commands.data.generatedAt || "local catalog"}`;
    renderCommands();
  } catch (error) {
    els.commandResults.innerHTML = `
      <tr>
        <td colspan="4">Could not load command data: ${escapeHtml(error.message)}</td>
      </tr>
    `;
  }
}

async function copySelectedCommand() {
  const command = els.detailCommand.textContent.trim();
  if (!command || command === "Pick a command") return;
  await navigator.clipboard.writeText(command);
  showToast("Command copied.");
}

els.promptFile.addEventListener("change", async () => {
  const file = els.promptFile.files?.[0];
  if (!file) return;
  els.fileName.textContent = file.name;
  els.promptInput.value = await file.text();
});

els.fixButton.addEventListener("click", fixPrompt);
els.clearButton.addEventListener("click", () => {
  els.promptInput.value = "";
  els.screenshotNoteInput.value = "";
  els.fixedOutput.value = "";
  els.contractOutput.textContent = "";
  els.envelopeOutput.textContent = "";
  els.proofPath.textContent = "No ProofPacket created yet.";
  els.proofPreview.textContent = "";
  state.fixedPrompt = "";
  state.sources = [];
  state.contract = null;
  state.mode = els.modeSelect.value;
  state.enhancements = selectedEnhancements();
  state.envelope = null;
  showView("fixed");
});
els.loadContextButton.addEventListener("click", () => refreshContext(els.apisToggle.checked, els.contextPackToggle.checked));
els.copyButton.addEventListener("click", copyOutput);
els.downloadButton.addEventListener("click", downloadOutput);
els.proofButton.addEventListener("click", createProofPacket);
els.browserButton.addEventListener("click", createBrowserEnvelope);
els.modeSelect.addEventListener("change", renderEnhancements);
els.resourceSearch.addEventListener("input", debounce(loadResources));
els.questionSearch.addEventListener("input", debounce(loadQuestions));
els.personaSelect.addEventListener("change", loadQuestions);
els.commandSearch.addEventListener("input", debounce((event) => {
  state.commands.query = event.target.value;
  state.commands.selectedKey = "";
  renderCommands();
}));
els.copyCommand.addEventListener("click", copySelectedCommand);

document.querySelectorAll(".output-tab").forEach((tab) => tab.addEventListener("click", () => showView(tab.dataset.view)));
document.querySelectorAll(".command-tab").forEach((button) => {
  button.addEventListener("click", () => setCommandView(button.dataset.commandView));
});
document.querySelectorAll(".command-segment").forEach((button) => {
  button.addEventListener("click", () => setCommandFilter(button.dataset.filter));
});
document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(button.dataset.jump)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
window.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== els.commandSearch) {
    event.preventDefault();
    els.commandSearch.focus();
    document.getElementById("commandSurface")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

await Promise.allSettled([
  loadHealth(),
  loadAudit(),
  loadGates(),
  loadResources(),
  loadQuestions(),
  loadPromptMasterCatalog(),
  refreshContext(false, false),
  loadCommandSurface(),
]);
