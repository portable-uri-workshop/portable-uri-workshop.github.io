import assert from "node:assert/strict";
import test from "node:test";

import {
  buildShareUrl,
  createOpenRecord,
  parseTargetHash,
  shouldAutoOpen,
  validateTargetUri,
} from "../site/src/redirector.mjs";

test("accepts a generic custom-scheme URI", () => {
  const result = validateTargetUri("kakaolink://send/path?x=1");
  assert.equal(result.ok, true);
  assert.equal(result.kind, "custom");
  assert.equal(result.metadata.scheme, "kakaolink");
});

test("blocks direct web, local, and executable schemes", () => {
  for (const uri of [
    "https://example.com",
    "file://local/path",
    "javascript://alert(1)",
    "vbscript://anything",
    "chrome-extension://identifier/page",
  ]) {
    assert.equal(validateTargetUri(uri).ok, false, uri);
  }
});

test("blocks Android intent URIs in every scheme casing", () => {
  for (const scheme of ["intent", "Intent", "INTENT", "iNtEnT"]) {
    assert.equal(validateTargetUri(
      `${scheme}://example/#Intent;scheme=kakaolink;S.browser_fallback_url=https%3A%2F%2Fevil.invalid;end`,
    ).ok, false, scheme);
  }
});

test("requires only the #to= input convention", () => {
  assert.equal(parseTargetHash("#target=kakaolink%3A%2F%2Fsend").ok, false);
  assert.equal(parseTargetHash("").hasTarget, false);
});

test("decodes the target exactly once", () => {
  const result = parseTargetHash("#to=kakaolink%3A%2F%2Fsend%2F%252Fstill-encoded");
  assert.equal(result.ok, true);
  assert.equal(result.uri, "kakaolink://send/%2Fstill-encoded");
});

test("builds an encoded fragment URL without a query input", () => {
  const result = buildShareUrl("https://portable-uri-workshop.github.io/", "kakao://send/a b");
  assert.equal(result.ok, true);
  assert.equal(result.url, "https://portable-uri-workshop.github.io/#to=kakao%3A%2F%2Fsend%2Fa%20b");
});

test("suppresses only a same-URI open inside 500ms", () => {
  const fingerprintA = "a".repeat(64);
  const fingerprintB = "b".repeat(64);
  const record = createOpenRecord(fingerprintA, 1_000);
  assert.equal(record.includes("kakao://"), false);
  assert.equal(shouldAutoOpen(record, fingerprintA, 1_499), false);
  assert.equal(shouldAutoOpen(record, fingerprintA, 1_500), true);
  assert.equal(shouldAutoOpen(record, fingerprintB, 1_001), true);
});

test("rejects control characters and oversized values", () => {
  assert.equal(validateTargetUri("kakao://send/a\u001b[31m").ok, false);
  assert.equal(validateTargetUri(`kakao://send/${"x".repeat(65_536)}`).ok, false);
});
