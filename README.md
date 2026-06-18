# DotCraft Math Maze — 촉각 샌드박스 수학 게임

**시각장애 아동이 소리로 방향을 찾고, 손끝으로 블록 세계를 탐험하며, TTS 안내를 따라 도형·수·논리 개념을 배우는 촉각 샌드박스 수학 게임**

A tactile sandbox math game for visually impaired children — navigate by sound, explore block worlds with your fingertips, and learn shapes, numbers, and logic through TTS guidance.

---

## 게임 소개

| 레벨 | 제목 | 학습 목표 |
|------|------|-----------|
| 1 | 도형 세계 (Shape World) | 삼각형·사각형·원·육각형·별 5종 도형의 이름과 특성 |
| 2 | 숫자 길 (Number Path) | 1~5 순서 세기, 방향 탐색 |
| 3 | 패턴 세계 (Pattern World) | ABAB 도형 패턴 완성, 논리적 추론 |

## 핵심 기능

- **공간 음향** — Web Audio API, 도형별 고유 음색 + 스테레오 패닝으로 방향 탐색
- **TTS 안내** — SpeechSynthesis(ko-KR/en-US), 이동·수집·오류 시 즉각 음성 피드백
- **촉각 매트릭스** — 60×40 도트 패드 렌더링, Dot Pad SDK 어댑터 연동 가능
- **KO/EN 이중 언어** — 런타임 전환
- **터치 D-패드** — 모바일 스와이프 + 버튼 컨트롤

## 조작법

| 키 | 기능 |
|----|------|
| ↑↓←→ / WASD | 이동 |
| Space / Enter | 주변 읽기 |
| H | 힌트 (가장 가까운 목표 방향 + 소리) |
| R | 마지막 TTS 반복 |
| 🌐 KO/EN | 언어 전환 |

## 실행

단일 HTML 파일로 서버 없이 바로 열 수 있습니다.

```bash
npx serve . -p 9002
# 또는 index.html을 브라우저에서 직접 열기
```

GitHub Pages: `https://byeol-coder.github.io/dot_maze/`

## Dot Pad SDK 연동

```javascript
// 실제 Dot Pad 기기 어댑터 주입
app.tactile.setAdapter({
  send(matrix) {
    DotPadSDK.render(matrix); // 60×40 Uint8Array 이진 매트릭스
  }
});
```

## 기술 스택

- 순수 HTML/CSS/JS (외부 의존성 없음, CDN 불필요)
- Web Audio API (절차적 음향 생성)
- Canvas 2D (게임 렌더링)
- SpeechSynthesis API (TTS)
- GitHub Pages 정적 배포

---

Dot Incorporation · byeol@dotincorp.com
