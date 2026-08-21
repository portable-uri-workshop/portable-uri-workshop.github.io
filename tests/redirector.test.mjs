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

test("accepts and describes an Android intent URI", () => {
  const uri = "intent://scan/#Intent;scheme=zxing;package=com.example.app;component=com.example.app/.Scan;S.browser_fallback_url=https%3A%2F%2Fexample.invalid;end";
  const result = validateTargetUri(uri);
  assert.equal(result.ok, true);
  assert.equal(result.kind, "intent");
  assert.equal(result.metadata.scheme, "zxing");
  assert.equal(result.metadata.package, "com.example.app");
  assert.equal(result.metadata.component, "com.example.app/.Scan");
  assert.equal(result.metadata.fallback, "https://example.invalid");
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

test("blocks a dangerous inner intent scheme", () => {
  const result = validateTargetUri("intent://example/#Intent;scheme=https;package=com.android.chrome;end");
  assert.equal(result.ok, false);
  assert.match(result.message, /내부 scheme/);
});

test("blocks a non-web or malformed intent fallback", () => {
  assert.equal(validateTargetUri(
    "intent://example/#Intent;scheme=demo;S.browser_fallback_url=javascript%3Aalert(1);end",
  ).ok, false);
  assert.equal(validateTargetUri(
    "intent://example/#Intent;scheme=demo;S.browser_fallback_url=%E0%A4%A;end",
  ).ok, false);
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
  const record = createOpenRecord("kakao://send/a", 1_000);
  assert.equal(shouldAutoOpen(record, "kakao://send/a", 1_499), false);
  assert.equal(shouldAutoOpen(record, "kakao://send/a", 1_500), true);
  assert.equal(shouldAutoOpen(record, "kakao://send/b", 1_001), true);
});

test("rejects control characters and oversized values", () => {
  assert.equal(validateTargetUri("kakao://send/a\u001b[31m").ok, false);
  assert.equal(validateTargetUri(`kakao://send/${"x".repeat(65_536)}`).ok, false);
});
