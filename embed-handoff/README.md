# ShapeCraft 임베드 핸드오프 패키지

TW(Tactile World) / Dot Games 허브에 **ShapeCraft by Dot**를 `<iframe>`으로 임베드하기 위한
드롭인 레이어 + 가이드입니다. (`dot-forest-code`의 Dot Forest 임베드 규격과 동일 패턴)

## 빠른 시작 (3단계)

1. `embed.js`, `embed.css` 를 게임의 `index.html` 과 같은 폴더에 복사.
2. `index.html` `<head>` 에 인라인 게임 스크립트보다 **먼저** 2줄 추가
   (→ `integration-snippet.html` 참고. 이 게임 저장소엔 이미 반영됨):
   ```html
   <link rel="stylesheet" href="embed.css">
   <script src="embed.js"></script>
   ```
3. `embed.js` 의 `ALLOWED_ORIGINS` 를 운영 TW 오리진으로 갱신 후 배포.

## 부모(TW) 쪽 임베드

```html
<iframe src="https://byeol-coder.github.io/dot_maze/?embed=1&preview=0"
        allow="bluetooth; microphone; autoplay; clipboard-write"
        title="ShapeCraft by Dot" style="width:100%;height:100%;border:0"></iframe>
```

## 파일

- **EMBED.md** — 전체 규격(파라미터·postMessage 프로토콜·오리진·체크리스트)
- **embed.js / embed.css** — 드롭인(게임 폴더에 복사)
- **iframe-example.html** — 부모 쪽 임베드 + 메시지 로깅 데모(브라우저로 열어 동작 확인)
- **integration-snippet.html** — index.html에 추가할 정확한 2줄

## 동작 확인

`iframe-example.html` 을 로컬/호스팅에서 열면 게임이 임베드되고, 우측 패널에
`SHAPECRAFT_*` 메시지 로그가 흐릅니다. (자식 게임 URL을 본인 호스팅으로 바꾸세요.)
단독 접속(파라미터 없이 직접 열기)은 기존과 100% 동일 — 임베드 레이어는
iframe 안이거나 `?embed=1`일 때만 활성화됩니다.
