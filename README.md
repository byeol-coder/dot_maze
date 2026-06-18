# ShapeCraft by Dot — 촉각 샌드박스 수학 게임

**시각장애 아동이 소리로 방향을 찾고, 손끝으로 블록 세계를 탐험하며, TTS 안내를 따라 도형·수·논리 개념을 배우는 촉각 샌드박스 수학 게임**

A tactile sandbox math game for visually impaired children — *explore shapes with sound, touch, and voice.*

---

## 월드 (Worlds)

| # | 월드 | 학습 목표 |
|---|------|-----------|
| 1 | 도형 숲 (Shape Forest) | 삼각형·사각형·원·육각형·별 5종 도형의 이름과 특성 |
| 2 | 꼭짓점 성 (Corner Castle) | 1~5 순서 세기, 방향 탐색 |
| 3 | 메아리 동굴 (Echo Cave) | 시각 없이 소리만으로 출구 찾기 (반향 정위) |
| 4 | 패턴 사원 (Pattern Temple) | 반복 도형 패턴 완성, 논리적 추론 |

월드는 순서대로 잠금 해제되며, 완료 시 별과 뱃지·XP를 획득해 프로필 레벨이 오릅니다. (진행도는 localStorage에 저장)

## 핵심 기능

- **몰입형 게임 HUD** — 전체 화면 던전 위에 떠 있는 오버레이: 좌상단 퀘스트 바(목표+도형 진행 칩), 우상단 별·레벨·XP, 우측 Dot Pad 미니맵+범례, 하단 동반자 대화 바(음성 파형), 좌하단 음성 상태, 하단 키캡 컨트롤 힌트
- **2D 플랫 아이콘** — 전 UI를 이모지 대신 일관된 인라인 SVG 아이콘(currentColor)으로 통일
- **마인크래프트풍 허브** — 플레이어 카드(레벨/XP/별/뱃지), 오늘의 미션, Dot Pad 연결 패널, 월드 카루셀
- **3D 공간 음향(HRTF)** — Web Audio `PannerNode`(HRTF) + `AudioListener`로 플레이어 위치·바라보는 방향을 추적. 도형·출구·소나가 **방위각+거리+앞뒤 구분**으로 들려 눈 없이 방향 탐색 가능 (헤드폰 권장). 월드별 잔향(Convolver: 숲은 가볍게·동굴은 크게), 발걸음음, 도형별 고유 음색
  > 마인크래프트 엔진(ClassiCube, C/WebGL)은 시각 그래픽 중심이라 시각장애 주 사용자에겐 전달이 약함 → 엔진 이식 대신 **소리·촉각 실감**에 투자. (시각 3D가 필요하면 three.js 레이어로 별도 확장 가능)
- **소나 스캔(Q)** — 동서남북을 차례로 방향 음(피치·패닝)으로 훑고, 각 방향의 거리·대상을 음성으로 보고
- **TTS 안내** — SpeechSynthesis(ko-KR/en-US), 이동·수집·오류·힌트 상황별 즉각 음성 피드백
- **햅틱 피드백** — 벽 충돌·수집·완료 시 진동 패턴(navigator.vibrate)
- **촉각 매트릭스** — 60×40 Dot Pad 렌더링, Dot Pad SDK 어댑터 연동
- **복셀 캐릭터** — 방향을 향하는 픽셀 탐험가 + 이동 잔상·수집 파티클, 키보드·Dot Pad 패닝키로 조작
- **선택형 3D 입체 화면** — three.js(MIT, CDN 지연 로드)로 3인칭 복셀 던전 뷰(벽·바닥 그리드·랜턴 광원·회전 포털·따뜻한 토치). 로드 실패/미지원 시 2D 탑다운으로 **자동 폴백**, **모바일·저사양은 기본 2D**(설정에서 토글), 픽셀비 제한. 접근성 로직(TTS·Dot Pad·HUD·3D 오디오)은 뷰와 무관하게 동일 동작
- **재질별 발걸음음 + 벽 근접 경고음** — 월드(숲·돌·동굴 물방울·사원)마다 발소리가 다르고, 진행 방향이 막히면 부드러운 경고음+진동
- **접근성 설정** — 음성 안내·말하기 속도·소리 크기·진동·**진동 세기**·**3D 화면**·고대비 화면·모션 줄이기 (localStorage 저장, prefers-reduced-motion 자동 반영)
- **KO/EN 이중 언어** — 런타임 전환

## 조작법 (Dot Pad 기기 기준)

| 입력 | 기능 |
|------|------|
| ← / → (패닝키) | 왼쪽·오른쪽 이동 |
| F1 / F2 (기능키) | 위·아래 이동 |
| F3 | 수집·주변 읽기·도형 선택 |
| F4 | 주변 스캔(소나) |
| ↑↓←→ / WASD (데스크톱 보조) | 이동 |
| Space / Enter | 상호작용 |
| H | 힌트 (목표 방향 + 소리) · R | 마지막 TTS 반복 |

> 화면의 Dot Pad 키 클러스터와 하단 힌트에 F1~F4 라벨이 표시됩니다. 이동은 셀 사이를 부드럽게 보간(glide)하며, 낮/밤이 자동 전환되고 캐릭터에 항상 켜진 하이라이트가 있어 어떤 조명에서도 잘 보입니다.

## 실제 Dot Pad 기기 연동 (DotPadSDK 3.0.0)

`DotPadSDK-3.0.0.js`를 동봉해 **실기기 연결·촉각 그래픽 출력·물리 키 입력**을 지원합니다.

- **연결** — 게임/허브의 Dot Pad 패널 또는 설정의 `Dot Pad 기기 → BLE / USB` 버튼. Web Bluetooth(BLE) 또는 Web Serial(USB)로 페어링 (Chromium 계열 + HTTPS/localhost 필요)
- **그래픽 출력** — 60×40 촉각 매트릭스를 기기 셀(예: DotPad 320 = 30×10셀)로 변환해 `displayGraphicData()`로 실시간 출력 (SDK GraphicMode 비트순서에 맞춰 변환)
- **물리 키 입력** — SDK `keyCallBack`을 게임 입력에 연결: 좌/우 패닝키 → 좌우 이동, **F1=위·F2=아래·F3=상호작용·F4=스캔** (화면 키 매핑과 동일)
- 미연결/미지원 환경에서는 화면상 Dot Pad·키보드로 그대로 플레이

```javascript
// 연결 시 내부적으로:
const sdk = new DotPadSDK();
sdk.setCallBack(onMessage, onKey);              // onKey가 PanningLeft/Right·KeyFunction1~4를 게임에 전달
const dev = await new DotPadScanner().startBleScan();
await sdk.connectBleDevice(dev);
sdk.displayGraphicData(matrixToDotPadHex(matrix, dev), dev, DisplayMode.GraphicMode); // 60×40 → 기기 출력
```

## (레거시) Dot Pad 패닝키 연동

캐릭터 이동은 키보드, 화면상 패닝키, 그리고 실제 Dot Pad 기기 패닝키를 하나의 `InputController`로 통합합니다.

```javascript
// 1) 외부 펌웨어/브릿지에서 DOM 이벤트로 구동
window.ShapeCraftInput.pan('up');   // 'up' | 'down' | 'left' | 'right' | 'select'

// 2) Dot Pad SDK 어댑터 주입 (물리 패닝키 구독)
app.input.attachDotPad({
  onKey(cb) { dotPad.onPanningKey(dir => cb(dir)); } // dir: up/down/left/right/select
});

// 3) 촉각 매트릭스 출력 어댑터
app.tactile.setAdapter({
  send(matrix) { DotPadSDK.render(matrix); } // 60×40 Uint8Array 이진 매트릭스
});
```

## 실행

단일 HTML 파일 + 캐릭터 이미지 1장. 외부 의존성·CDN 없음.

```bash
npx serve . -p 9002
# 또는 index.html을 브라우저에서 직접 열기
```

GitHub Pages: `https://byeol-coder.github.io/dot_maze/`

## 기술 스택

- 순수 HTML/CSS/JS (의존성 없음)
- Web Audio API (절차적 음향 생성)
- Canvas 2D (허브 씬·게임 렌더링·복셀 캐릭터)
- SpeechSynthesis API (TTS)
- localStorage (진행도 저장)

---

Dot Incorporation · byeol@dotincorp.com
