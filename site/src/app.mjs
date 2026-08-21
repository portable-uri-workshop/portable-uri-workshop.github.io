import {
  buildShareUrl,
  createOpenRecord,
  parseTargetHash,
  shouldAutoOpen,
} from "./redirector.mjs";

const STORAGE_KEY = "portable-uri-workshop:last-open";
const AUTO_OPEN_DELAY_MS = 250;

const generatorPanel = document.querySelector("#generator-panel");
const redirectPanel = document.querySelector("#redirect-panel");
const uriInput = document.querySelector("#uri-input");
const generatedUrl = document.querySelector("#generated-url");
const generatorMessage = document.querySelector("#generator-message");
const statusTitle = document.querySelector("#status-title");
const statusDetail = document.querySelector("#status-detail");
const originalUri = document.querySelector("#original-uri");
const metadataList = document.querySelector("#metadata-list");
const openAgainButton = document.querySelector("#open-again");
const copyOriginalButton = document.querySelector("#copy-original");
const copyGeneratedButton = document.querySelector("#copy-generated");
const buildCommit = document.querySelector("#build-commit");

let currentUri = "";

function setMessage(element, text, tone = "info") {
  element.textContent = text;
  element.dataset.tone = tone;
}

async function copyText(value, messageElement, successMessage) {
  try {
    await navigator.clipboard.writeText(value);
    setMessage(messageElement, successMessage, "success");
  } catch {
    setMessage(messageElement, "자동 복사에 실패했습니다. 텍스트를 직접 선택해 복사하세요.", "error");
  }
}

function renderMetadata(result) {
  metadataList.replaceChildren();
  const entries = result.kind === "intent"
    ? [
        ["내부 scheme", result.metadata.scheme],
        ["package", result.metadata.package || "(없음)"],
        ["component", result.metadata.component || "(없음)"],
        ["fallback", result.metadata.fallback || "(없음)"],
      ]
    : [["scheme", result.metadata.scheme]];

  for (const [label, value] of entries) {
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = label;
    detail.textContent = value;
    metadataList.append(term, detail);
  }
}

function openTarget(manual = false) {
  if (!currentUri) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, createOpenRecord(currentUri, Date.now()));
  } catch {
    // Storage can be unavailable in hardened browser modes; opening remains usable.
  }
  setMessage(
    statusDetail,
    manual ? "URI를 다시 열었습니다. 앱이 열리지 않으면 원본 URI를 복사하세요." : "URI를 여는 중입니다…",
  );
  window.location.assign(currentUri);
}

function renderRedirect(result) {
  generatorPanel.hidden = true;
  redirectPanel.hidden = false;
  currentUri = result.uri;
  originalUri.textContent = result.uri;
  statusTitle.textContent = result.kind === "intent" ? "Android intent URI" : "앱 딥링크";
  renderMetadata(result);

  let previous = null;
  try {
    previous = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    // Treat unavailable storage as no previous navigation record.
  }
  if (!shouldAutoOpen(previous, result.uri, Date.now())) {
    setMessage(statusDetail, "500ms 안에 같은 URI가 반복되어 자동 실행을 멈췄습니다.", "warning");
    return;
  }
  setMessage(statusDetail, "250ms 후 자동으로 URI를 엽니다.");
  window.setTimeout(() => openTarget(false), AUTO_OPEN_DELAY_MS);
}

function renderGenerator(message = "") {
  currentUri = "";
  generatorPanel.hidden = false;
  redirectPanel.hidden = true;
  if (message) setMessage(generatorMessage, message, "error");
}

function route() {
  const result = parseTargetHash(window.location.hash);
  if (!result.ok) {
    renderGenerator(result.message);
    return;
  }
  if (!result.hasTarget) {
    renderGenerator();
    return;
  }
  renderRedirect(result);
}

document.querySelector("#generator-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const result = buildShareUrl(baseUrl, uriInput.value);
  if (!result.ok) {
    generatedUrl.value = "";
    setMessage(generatorMessage, result.message, "error");
    return;
  }
  generatedUrl.value = result.url;
  setMessage(generatorMessage, "공유 URL을 생성했습니다.", "success");
});

copyGeneratedButton.addEventListener("click", () => {
  if (!generatedUrl.value) {
    setMessage(generatorMessage, "먼저 공유 URL을 생성하세요.", "warning");
    return;
  }
  copyText(generatedUrl.value, generatorMessage, "공유 URL을 복사했습니다.");
});

openAgainButton.addEventListener("click", () => openTarget(true));
copyOriginalButton.addEventListener("click", () => {
  copyText(currentUri, statusDetail, "원본 URI를 복사했습니다.");
});

const commit = globalThis.PORTABLE_URI_BUILD?.commit;
if (/^[0-9a-f]{40}$/.test(commit || "")) {
  buildCommit.textContent = commit.slice(0, 12);
  buildCommit.href = `https://github.com/portable-uri-workshop/portable-uri-workshop.github.io/commit/${commit}`;
} else {
  buildCommit.textContent = "local source";
  buildCommit.removeAttribute("href");
}

window.addEventListener("hashchange", route);
route();
