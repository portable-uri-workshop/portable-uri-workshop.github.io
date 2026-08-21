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

function parseIntentMetadata(uri) {
  const marker = "#Intent;";
  const markerIndex = uri.indexOf(marker);
  if (markerIndex < 0 || !uri.endsWith(";end")) {
    return rejected("Android intent URI 형식이 올바르지 않습니다.");
  }

  const authority = uri.slice("intent://".length, markerIndex);
  if (!authority || /\s/.test(authority)) {
    return rejected("intent URI의 대상이 비어 있거나 올바르지 않습니다.");
  }

  const metadata = {
    scheme: "",
    package: "",
    component: "",
    fallback: "",
  };
  const body = uri.slice(markerIndex + marker.length, -";end".length);
  for (const entry of body.split(";")) {
    const separator = entry.indexOf("=");
    if (separator < 1) continue;
    const key = entry.slice(0, separator);
    const value = entry.slice(separator + 1);
    if (key === "scheme") metadata.scheme = value;
    if (key === "package") metadata.package = value;
    if (key === "component") metadata.component = value;
    if (key === "S.browser_fallback_url") metadata.fallback = value;
  }

  if (!SCHEME_PATTERN.test(metadata.scheme)) {
    return rejected("intent URI에는 명시적인 정상 scheme= 값이 필요합니다.");
  }
  if (isBlockedScheme(metadata.scheme)) {
    return rejected(`intent 내부 scheme '${metadata.scheme}'은 허용되지 않습니다.`);
  }

  if (metadata.fallback) {
    let decodedFallback;
    try {
      decodedFallback = decodeURIComponent(metadata.fallback);
    } catch {
      return rejected("intent fallback URL의 percent-encoding이 올바르지 않습니다.");
    }
    if (!/^https?:\/\//i.test(decodedFallback)) {
      return rejected("intent fallback은 http/https URL만 허용됩니다.");
    }
    if (CONTROL_CHARACTER_PATTERN.test(decodedFallback)) {
      return rejected("intent fallback에 제어 문자가 포함돼 있습니다.");
    }
    metadata.fallback = decodedFallback;
  }

  return { ok: true, metadata };
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

  if (uri.startsWith("intent://")) {
    const parsed = parseIntentMetadata(uri);
    if (!parsed.ok) return parsed;
    return { ok: true, kind: "intent", metadata: parsed.metadata };
  }

  const match = /^([A-Za-z][A-Za-z0-9+.-]*):\/\/.+$/s.exec(uri);
  if (!match) {
    return rejected("scheme://... 형식의 URI가 필요합니다.");
  }
  const scheme = match[1];
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

export function shouldAutoOpen(storageValue, uri, now) {
  if (!storageValue) return true;
  try {
    const previous = JSON.parse(storageValue);
    return previous.uri !== uri || now - previous.time >= 500 || now < previous.time;
  } catch {
    return true;
  }
}

export function createOpenRecord(uri, now) {
  return JSON.stringify({ uri, time: now });
}
