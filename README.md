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

- **마인크래프트풍 허브** — 플레이어 카드(레벨/XP/별/뱃지), 오늘의 미션, Dot Pad 연결 패널, 월드 카루셀
- **공간 음향** — Web Audio API, 도형별 고유 음색 + 스테레오 패닝, 근접 비콘·반향음, 월드별 앰비언트 사운드, 발걸음음
- **소나 스캔(Q)** — 동서남북을 차례로 방향 음(피치·패닝)으로 훑고, 각 방향의 거리·대상을 음성으로 보고
- **TTS 안내** — SpeechSynthesis(ko-KR/en-US), 이동·수집·오류·힌트 상황별 즉각 음성 피드백
- **햅틱 피드백** — 벽 충돌·수집·완료 시 진동 패턴(navigator.vibrate)
- **촉각 매트릭스** — 60×40 Dot Pad 렌더링, Dot Pad SDK 어댑터 연동
- **복셀 캐릭터** — 방향을 향하는 픽셀 탐험가 + 이동 잔상·수집 파티클, 키보드·Dot Pad 패닝키로 조작
- **접근성 설정** — 음성 안내·말하기 속도·소리 크기·진동·고대비 화면·모션 줄이기 (localStorage 저장, prefers-reduced-motion 자동 반영)
- **KO/EN 이중 언어** — 런타임 전환

## 조작법

| 입력 | 기능 |
|------|------|
| ↑↓←→ / WASD | 캐릭터 이동 |
| Dot Pad 패닝키 (화면/기기) | 캐릭터 이동 |
| Space / Enter / 중앙키 | 주변 읽기·도형 선택 |
| H | 힌트 (목표 방향 + 소리) |
| R | 마지막 TTS 반복 |
| 🌐 | KO/EN 언어 전환 |

## Dot Pad 패닝키 연동

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
