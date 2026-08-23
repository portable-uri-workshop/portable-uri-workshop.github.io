# Portable URI Redirector

외부 스크립트나 서버 API 없이 GitHub Pages에서 동작하는 범용 custom-scheme URI redirector입니다. Android `intent:` URI는 지원하지 않습니다.

공개 주소:

```text
https://portable-uri-workshop.github.io/#to=<percent-encoded URI>
```

## 동작

- `#to=` fragment를 정확히 한 번 decode합니다. `?to=` query 입력은 지원하지 않습니다.
- 검증을 통과한 URI는 250ms 뒤 자동으로 엽니다.
- 같은 탭에서 500ms 안에 같은 URI가 반복되면 자동 실행을 중지합니다.
- 실패하거나 반복이 감지되면 `다시 열기`와 `원본 URI 복사`를 사용할 수 있습니다.
- 페이지 root에서는 URI 검증, 공유 URL 생성, 복사 UI를 제공합니다.
- `scheme://...` custom URI를 지원하고 250ms 자동 실행을 유지합니다.
- 직접 `http/https`, Android `intent:`, 스크립트·브라우저·로컬 scheme은 대소문자와 관계없이 차단합니다.
- `browser_fallback_url`을 포함한 Android intent 기능은 지원하지 않습니다.
- 검증 직후 주소의 `#to=` fragment를 제거하고, 반복 방지용 sessionStorage에는 raw URI 대신 SHA-256 fingerprint와 timestamp만 저장합니다.

주소의 fragment는 최초 HTTP 요청에 포함되지 않지만, 링크를 열고 난 뒤 대상 앱·브라우저·확장 프로그램의 동작까지 이 프로젝트가 통제하지는 않습니다. URI에 토큰이나 식별값이 포함될 수 있으므로 생성된 URL을 공개적으로 게시하지 마세요.

## 프라이버시와 신뢰 모델

배포물은 HTML, CSS, JavaScript와 `.nojekyll`뿐입니다. 외부 JS/CSS/font, analytics, telemetry, fetch/XHR/WebSocket을 사용하지 않으며 CSP의 `connect-src 'none'`으로 페이지의 네트워크 API도 차단합니다. 화면에 표시하는 URI는 DOM `textContent`/form value로만 설정합니다.

페이지 하단에서 공개 source 저장소와 실제 배포 commit을 확인할 수 있습니다. Release에는 같은 source artifact로 만든 Pages payload ZIP, SHA-256, GitHub Artifact Attestation이 첨부됩니다.

## 로컬 테스트와 빌드

Node.js 20 이상이 필요하며 외부 npm dependency는 없습니다.

```bash
npm test
npm run build -- 0123456789abcdef0123456789abcdef01234567
```

빌드 결과는 `_site/`에 생성됩니다.

## 라이선스

[MIT License](LICENSE)
