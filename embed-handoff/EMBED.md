# ShapeCraft by Dot — TW(Tactile World) / Dot Games 임베드 가이드

**대상:** ShapeCraft by Dot (단일 파일 HTML 촉각 미로 학습게임)
**목적:** TW 닷게임스 허브에 `<iframe>`으로 임베드하기 위한 **비침습 레이어**.
게임 로직(`index.html` 인라인 스크립트)은 **건드리지 않고**, 드롭인 2파일 + `<head>` 2줄만 추가합니다.

> 이 레이어는 `dot-forest-code`의 Dot Forest 임베드 규격(EMBED.md)과 동일한 패턴입니다:
> `?embed`/`?preview`/`?lang` 파라미터, 오리진 검증 `postMessage` 브리지(`'*'` 미사용), `allow="bluetooth"`.

---

## 1. 패키지 구성

| 파일 | 설명 |
|---|---|
| `embed.js` | URL 파라미터 파싱 → `html` 클래스 토글, 부모↔자식 `postMessage` 브리지(오리진 검증), `ResizeObserver`, 공개 API `window.ShapeCraftEmbed` |
| `embed.css` | `html.is-embed` / `html.no-preview` **한정** 레이아웃(풀필·스크롤 제거·프리뷰 dock 숨김). 단독 실행 화면은 불변 |
| `iframe-example.html` | 부모(TW) 쪽 임베드·메시지 수신 예시 (그대로 열어 동작 확인용) |
| `integration-snippet.html` | `index.html`에 추가할 정확한 2줄 |

## 2. 게임에 반영 (단일 파일이라 빌드·번들 없음)

1. `embed.js`, `embed.css`를 게임 폴더(= `index.html`과 같은 위치)에 복사.
2. `index.html`의 `<head>`에, **인라인 게임 `<script>`보다 먼저** 아래 2줄 추가
   (이 저장소의 `index.html`에는 이미 반영돼 있음):

```html
<link rel="stylesheet" href="embed.css">
<script src="embed.js"></script>
```

그게 전부입니다. 단독 접속(top-level)에서는 아무 변화 없음 — 임베드 클래스/메시지는
**iframe 안이거나 `?embed=1`일 때만** 활성화됩니다.

## 3. URL 파라미터

| 파라미터 | 값 | 효과 |
|---|---|---|
| `embed` | `1` / `0` | 임베드 모드 강제 on/off. iframe 안이면 **기본 on**(없어도 자동), `0`으로 강제 해제 |
| `preview` | `0` | 화면상 Dot Pad 미니맵(프리뷰 dock) 숨김. **하드웨어 출력은 계속 동작** |
| `lang` | `ko` / `en` | 시작 언어 |
| `controls` | `compact` | 좁은 모달용 컴팩트(헤더·부제 축소) |
| `theme` | `dark` / `light` | `data-theme` 설정(게임이 참고) |
| `autostart` | `1` | 로드 후 자동으로 오늘의 도전 시작(오디오는 첫 입력 후 활성) |

권장 임베드 URL: `?embed=1&preview=0`

## 4. postMessage 프로토콜

모든 메시지는 **오리진 검증**을 통과해야 하며 `'*'`를 쓰지 않습니다(부모 오리진 또는 허용 목록).

### 자식(게임) → 부모(TW)
`{ type, ... }` 형태. 핵심 이벤트는 레거시 `shapecraft:*`(envelope `{source:'shapecraft', type, payload}`)로도 동시 발신해 부모 정본 호환.

| type | payload | 시점 |
|---|---|---|
| `SHAPECRAFT_LOADED` | — | DOM 준비 |
| `SHAPECRAFT_READY` | `{game,version}` | 게임 엔진 기동 완료 |
| `SHAPECRAFT_STARTED` | — | 플레이 시작 |
| `SHAPECRAFT_PROGRESS` | `{screen,stars,score}` | 진행도 변화 시(스로틀) |
| `SHAPECRAFT_COMPLETE` | `{world,endless,depth,stars}` | 월드 클리어 |
| `SHAPECRAFT_RESIZE` | `{width,height}` | 리사이즈 |
| `SHAPECRAFT_EXIT` | `{reason}` | 게임 내 나가기 |
| `SHAPECRAFT_ERROR` | `{message,code}` | 오류 |

### 부모(TW) → 자식(게임)

| type | 효과 |
|---|---|
| `SHAPECRAFT_START` | 오늘의 도전 시작 |
| `SHAPECRAFT_PAUSE` / `SHAPECRAFT_RESUME` | 입력 정지/재개 |
| `SHAPECRAFT_FOCUS` | 게임 캔버스 포커스(키보드 입력 유도) |
| `SHAPECRAFT_SET_PREVIEW` | `{visible}` 프리뷰 dock 표시/숨김 |
| `SHAPECRAFT_SET_COMPACT` | `{enabled}` 컴팩트 토글 |
| `SHAPECRAFT_MUTE` | `{muted}` 음소거 |
| `SHAPECRAFT_SET_LANG` | `{lang:'ko'|'en'}` 언어 |

레거시 호환: `{source:'tw', type:'tw:pause'|'tw:resume'|'tw:setLang', lang}` 도 수신.

공개 API(부모에서 같은 출처일 때, 또는 디버깅): `window.ShapeCraftEmbed.{start,pause,resume,focus,setMuted,setPreviewVisible,setCompactMode,getState,destroy}`

## 5. iframe 임베드 예시 (부모/TW 쪽)

```html
<iframe
  src="https://byeol-coder.github.io/dot_maze/?embed=1&preview=0"
  allow="bluetooth; microphone; autoplay; clipboard-write"
  title="ShapeCraft by Dot — 촉각 학습게임"
  style="width:100%;height:100%;border:0"></iframe>
```

- **`allow="bluetooth"` 필수** — iframe 안에서 Dot Pad(Web Bluetooth) 연결을 허용. (HTTPS + 버튼 제스처 필요, Chromium 계열)
- **`autoplay`/`microphone`** — 게임 오디오/음성. 권장 모달 크기: 가로 `96vw`, 세로 `calc(100vh - 96px)`, 컨테이너 `overflow:hidden`.

## 6. 오리진 설정 (배포 전 필수)

`embed.js` 상단 `ALLOWED_ORIGINS` 를 **운영 TW 오리진**으로 갱신하세요(현재 `https://tib-preview.vercel.app` 포함).
나를 임베드한 부모(referrer) 오리진은 항상 신뢰하므로, 자식 호스팅 위치와 무관하게 동작합니다.

- **게임(자식) 호스팅:** `https://byeol-coder.github.io/dot_maze/` (GitHub Pages, HTTPS, 상대경로)
- **자식 오리진(부모가 `event.origin` 검증에 쓸 값):** `https://byeol-coder.github.io`

## 7. 검증 체크리스트 (런타임)

- [ ] `?embed=1` 진입 시 스크롤바·여백 없이 풀필, 게임 정상 기동
- [ ] `?preview=0` 시 화면 Dot Pad 미니맵이 **공간까지** 사라짐 / **단, Dot Pad 하드웨어 출력은 정상**
- [ ] iframe 가로·세로·정사각 임의 비율 리사이즈에도 캔버스 왜곡·스크롤바 없음
- [ ] `allow="bluetooth"` iframe 안에서 **Dot Pad 연결 성공**(HTTPS·버튼 제스처)
- [ ] `?lang=en` / `SHAPECRAFT_SET_LANG` 로 언어 전환
- [ ] 부모에서 `SHAPECRAFT_PAUSE`/`RESUME`/`MUTE` 동작
- [ ] 모든 `postMessage` 오리진 검증 통과, `'*'` 미사용
- [ ] 단독(top-level) 직접 접속은 회귀 없음(임베드 클래스/메시지 미적용)
