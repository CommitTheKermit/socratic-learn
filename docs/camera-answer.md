# 모바일 카메라 답변

모바일 화면의 수준 확인 및 학습 확인 질문에서 `카메라 답변`을 선택한다.
서술형 입력칸은 촬영 후 인식된 텍스트가 있을 때 표시된다. `직접 입력`으로도 열 수 있다.
객관식은 기존 선택지를 유지한다. OCR 결과는 자동 제출하지 않으며 수정 후 기존 채점으로 보낸다.

## 사진 처리와 무음

- HTTPS에서 카메라 권한을 요청하고 후면 카메라 영상을 Canvas의 JPEG로 추출한다.
- 마이크를 요청하지 않고 촬영 효과음을 재생하지 않는다. 시스템 카메라 앱을 열지 않는다.
- Android Chrome / iPhone Safari의 실기기 무음 동작은 별도 확인이 필요하다.
- 촬영본을 확인하고 `인식하여 답변에 넣기`를 누를 때만 Firebase Functions를 거쳐 Google Cloud Vision으로 전송한다.
- 이미지의 긴 변은 최대 1920px, JPEG 품질은 0.9, 서버 입력 상한은 2MiB다.
- 서비스의 Storage, Firestore, 세션, 로그에는 사진을 저장하지 않는다. 외부 OCR 제공자의 처리는 해당 서비스 정책을 따른다.
- 인식된 텍스트는 기존 답변과 동일하게 세션 저장 및 AI 채점 대상이 된다.
- 촬영 완료, 취소, 화면 이탈, 탭 숨김 시 카메라 트랙을 종료한다.

## Functions 설정

`answerOcr`는 `us-central1`에 배포하는 인증된 POST 함수다.
요청/응답 계약은 `frontend/src/api/contract.ts`의 `AnswerOcrRequest`, `AnswerOcrResponse`다.
Google Cloud Vision의 `DOCUMENT_TEXT_DETECTION` 기능 하나만 호출한다.
키 파일을 추가하지 않고 Functions 실행 서비스 계정의 기본 인증을 사용한다.
프로젝트의 Vision API 활성화, 결제 및 실행 서비스 계정의 API 사용 권한이 필요하다.
로컬 ADC의 할당량 프로젝트가 다르면 테스트 실행에만
`GOOGLE_CLOUD_QUOTA_PROJECT=socratic-learn-web`을 지정한다. 전역 인증 설정을 변경할 필요는 없다.

초기 비용 상한은 Functions 환경변수로 조정한다. 미설정 시 아래 기본값을 사용한다.

| 항목 | 기본값 |
|---|---:|
| `OCR_DAILY_LIMIT` | UID당 KST 하루 20회 |
| 분당 제한 | UID당 KST 분당 5회 |
| `OCR_MONTHLY_LIMIT` | 프로젝트 전체 KST 월 10,000회 |

`ocrUsageCounters`에서 세 카운터를 같은 Firestore 트랜잭션으로 예약한다.
한도 조회/예약 실패 시 OCR을 호출하지 않는다. 실패·취소된 호출도 예약량을 돌려주지 않는다.
자동 재시도는 꺼져 있다. 새 UID로 사용자 한도를 우회해도 전체 월 한도는 공유한다.
전체 월 카운터 한 문서는 초기 규모용이며 높은 동시성에서 경합이 생기면 할당량 분할이 필요하다.
`expireAt`은 선택적 Firestore TTL 필드다. TTL을 설정하지 않아도 한도는 날짜별로 분리된다.
이 제한은 OCR 호출 수를 제한하며 Functions/Firestore의 모든 인프라 비용을 제한하는 것은 아니다.

## 검증과 한계

- 함수 단위: `cd functions && npm test`
- UI 단위: `cd frontend && npm test -- src/components/CameraAnswer.test.tsx`
- 브라우저: Vite를 5198 포트에서 켜고 `cd frontend && node e2e/camera-answer.cjs`
  - Chromium 가상 카메라와 OCR/채점 응답 mock을 사용하므로 외부 AI/OCR 요금이 없다.
  - Chromium이 없으면 `npx playwright install chromium --only-shell`로 설치한다.
  - 설치된 Chrome을 쓰려면 `E2E_BROWSER_CHANNEL=chrome`을 지정한다.
- 실제 OCR 품질 검증은 한국어·영어 손글씨와 수식이 섞인 촬영본으로 해야 한다.
- Google Vision은 문자 인식 서비스다. 분수·행렬·적분 같은 수식의 구조를 LaTeX로 복원하는 기능은 이 구현에 없다.
  수식이 포함된 답변을 촬영할 수 있지만 정확한 수식 변환을 보장하지 않는다.

구현 시 검증: 프런트엔드 764개 및 Functions 37개 단위 테스트, 양쪽 빌드,
CSS 가드, 브라우저 촬영/입력/채점 흐름(mock), 에뮬레이터 기동이 통과했다.
실제 Vision API 연결은 테스트 화면의 한국어 인쇄 텍스트로 확인했다.
실제 손글씨·수식 품질과 휴대전화 촬영음 검증, 서비스 배포는 별도다.

참고: [Google 손글씨 OCR](https://docs.cloud.google.com/vision/docs/handwriting),
[지원 문자](https://docs.cloud.google.com/vision/docs/languages),
[요금](https://cloud.google.com/vision/pricing).

## 구조 메모

기존 `StageLearn`은 화면 렌더링, 질문 대화, 분기 흐름까지 한 컴포넌트에 담아
단일 책임 원칙(SRP)에 어긋나는 구조다. 이번 카메라 생명주기와 OCR 입력 UI는
`CameraAnswer`로 분리해 수준 확인과 학습 질문에서 재사용한다. 기존 전체 구조의 재편은 포함하지 않는다.
