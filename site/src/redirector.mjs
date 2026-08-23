export const MAX_URI_LENGTH = 65_536;

const SCHEME_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]*$/;
const BLOCKED_SCHEMES = new Set([
  "about",
  "blob",
  "chrome",
  "chrome-extension",
  "content",
  "data",
  "devtools",
  "edge",
  "file",
  "filesystem",
  "http",
  "https",
  "intent",
  "javascript",
  "ms-appdata",
  "ms-appx",
  "moz-extension",
  "resource",
  "vbscript",
  "view-source",
]);

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/;

function rejected(message) {
  return { ok: false, message };
}

function isBlockedScheme(scheme) {
  return BLOCKED_SCHEMES.has(scheme.toLowerCase());
}

export function validateTargetUri(uri) {
  if (typeof uri !== "string" || uri.length === 0) {
    return rejected("URI를 입력하세요.");
  }
  if (uri.length > MAX_URI_LENGTH) {
    return rejected(`URI가 최대 길이 ${MAX_URI_LENGTH.toLocaleString("en-US")}자를 초과합니다.`);
  }
  if (CONTROL_CHARACTER_PATTERN.test(uri)) {
    return rejected("제어 문자가 포함된 URI는 허용되지 않습니다.");
  }

  const match = /^([A-Za-z][A-Za-z0-9+.-]*):\/\/.+$/s.exec(uri);
  if (!match) {
    return rejected("scheme://... 형식의 URI가 필요합니다.");
  }
  const scheme = match[1].toLowerCase();
  if (isBlockedScheme(scheme)) {
    return rejected(`scheme '${scheme}'은 허용되지 않습니다.`);
  }
  return { ok: true, kind: "custom", metadata: { scheme } };
}

export function parseTargetHash(hash) {
  if (!hash || hash === "#") return { ok: true, hasTarget: false };
  if (!hash.startsWith("#to=")) {
    return rejected("주소에는 #to= fragment만 사용할 수 있습니다.");
  }

  const encoded = hash.slice("#to=".length);
  if (!encoded) return rejected("#to= 뒤에 URI가 필요합니다.");
  try {
    const uri = decodeURIComponent(encoded);
    const validation = validateTargetUri(uri);
    if (!validation.ok) return validation;
    return { ok: true, hasTarget: true, uri, ...validation };
  } catch (error) {
    if (error instanceof URIError) {
      return rejected("percent-encoding이 올바르지 않습니다.");
    }
    throw error;
  }
}

export function buildShareUrl(baseUrl, uri) {
  const validation = validateTargetUri(uri);
  if (!validation.ok) return validation;
  return {
    ok: true,
    url: `${baseUrl}#to=${encodeURIComponent(uri)}`,
    ...validation,
  };
}

export function shouldAutoOpen(storageValue, fingerprint, now) {
  if (!storageValue || !fingerprint) return true;
  try {
    const previous = JSON.parse(storageValue);
    return previous.fingerprint !== fingerprint
      || now - previous.time >= 500
      || now < previous.time;
  } catch {
    return true;
  }
}

export function createOpenRecord(fingerprint, now) {
  return JSON.stringify({ fingerprint, time: now });
}
