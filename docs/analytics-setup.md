# Firebase Analytics (GA4) 설정 체크리스트

> 이 문서의 단계는 **콘솔에서 직접 클릭/입력**해야 하는 부분이다(코드로 대체 불가).
> 프로젝트: `socratic-learn-web` (commit3921 계정).
> 완료 후 `frontend/.env.local` 에 `VITE_FIREBASE_MEASUREMENT_ID` 를 추가한다.

---

## 1. measurementId 확인

Firebase Console -> 프로젝트 설정(톱니) -> **일반** 탭 -> "내 앱" 에서
웹 앱(`</>`) 선택.

config 객체에서 `measurementId` 를 확인한다:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "socratic-learn-web.firebaseapp.com",
  projectId: "socratic-learn-web",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
  measurementId: "G-XXXXXXXXXX",   // <-- 이 값
};
```

> `measurementId` 가 없으면 **Analytics** 탭에서 Google Analytics 연결이 필요하다.
> 아래 1-a 단계를 따른다.

### 1-a. Google Analytics 연결 (measurementId 없는 경우)

Firebase Console -> 프로젝트 설정(톱니) -> **통합** 탭
-> **Google Analytics** 섹션 -> **연결** 클릭.

- Google 계정 선택 -> Analytics 계정 선택 (없으면 새로 만들기)
- 연결 완료 후 **일반** 탭으로 돌아가면 `measurementId` 가 채워진다.

### 1-b. .env.local 에 추가

확보한 값을 `frontend/.env.local` 에 추가한다:

```
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

> 이 값은 비밀이 아니다(GA4 공개 식별자). 번들에 인라인되어도 무방하다.
> 값이 없거나 빈 문자열이면 `src/lib/firebase.ts` 의 analytics 초기화가
> 조용히 비활성화되므로 앱은 정상 동작한다.

---

## 2. GA4 커스텀 디멘션 등록

socratic-learn-2 의 sl_ 이벤트는 아래 커스텀 파라미터를 전송한다.
GA4 탐색 보고서/BigQuery 에서 이 값을 필터/그룹으로 쓰려면 **커스텀 디멘션**으로
등록해야 한다(등록 전에는 수집은 되지만 UI 에서 활용 불가).

### 2-a. 등록 경로

Google Analytics 콘솔 (analytics.google.com) -> 해당 GA4 속성 선택
-> 왼쪽 메뉴 **관리** -> **속성** 열 -> **맞춤 정의** -> **맞춤 측정기준**
-> **맞춤 측정기준 만들기** 클릭.

### 2-b. 등록할 디멘션 목록

| 측정기준 이름 | 범위 | 이벤트 파라미터 이름 | 설명 |
|---|---|---|---|
| session_id | 이벤트 | `session_id` | 학습 세션 고유 ID |
| concept | 이벤트 | `concept` | 학습 주제 |
| mode | 이벤트 | `mode` | 학습 모드 (light/socratic/deep) |
| stage | 이벤트 | `stage` | 단계 이름 (input/probe/learn/done) |
| step_idx | 이벤트 | `step_idx` | learn 단계 내 스텝 인덱스 |
| question_id | 이벤트 | `question_id` | 질문 식별자 |
| choice | 이벤트 | `choice` | 분기 선택지 |
| from_idx | 이벤트 | `from_idx` | 이동 출발 스텝 인덱스 |
| to_idx | 이벤트 | `to_idx` | 이동 도착 스텝 인덱스 |
| direction | 이벤트 | `direction` | 이동 방향 (next/back/skip) |

> **범위 선택**: 모두 **이벤트** 범위로 등록한다(사용자 범위는 uid 전용이므로
> 여기선 해당 없음).

> GA4 속성 1개당 커스텀 디멘션은 50개까지 등록 가능하다.
> 위 10개 등록 후 여유 40개가 남는다.

### 2-c. 반영 지연

등록 후 GA4 UI 에서 즉시 필터로 쓸 수 있지만, 이미 수집된 과거 데이터에는
소급 적용되지 않는다. BigQuery 연동 데이터는 등록 이후 수집분부터 파라미터가
컬럼으로 나타난다.

---

## 3. BigQuery export 활성화

GA4 -> BigQuery 연동을 켜면 원시 이벤트 데이터가 BigQuery 데이터셋으로
자동 내보내진다. 이벤트 단위 분석(완료율, 이탈 단계, 세션 요약)에 SQL 을 쓸 수 있다.

### 3-a. 사전 조건

- Google Cloud 프로젝트 준비 (Firebase 프로젝트와 동일 GCP 프로젝트 권장)
- BigQuery API 활성화:
  GCP Console -> API 및 서비스 -> **API 라이브러리** -> "BigQuery API" 검색 -> 사용

### 3-b. 연결 경로

Google Analytics 콘솔 -> **관리** -> **속성** 열
-> **BigQuery 연결** (또는 **제품 링크** 아래 **BigQuery 연결**)
-> **연결** 클릭.

1. GCP 프로젝트 선택 (소유 계정의 GCP 프로젝트 목록이 나온다)
2. 데이터 위치 선택 (예: `us-central1` - Functions 리전과 동일 권장)
3. 내보내기 빈도 선택:
   - **매일** (기본값) - 하루 1회 일괄 내보내기. 무료 할당량 내에서 운영 가능.
   - **스트리밍** - 실시간이지만 BigQuery 스트리밍 삽입 비용 발생. MVP 단계에서는 불필요.
4. **연결** 클릭 -> 완료

### 3-c. 생성되는 데이터셋 구조

연결 후 BigQuery 에 아래 구조가 생성된다:

```
프로젝트ID.analytics_PROPERTY_ID/
  events_YYYYMMDD          -- 일별 이벤트 테이블 (매일 내보내기)
  events_intraday_YYYYMMDD -- 당일 누적 (매일 내보내기 시 생성 후 익일 삭제)
```

### 3-d. 완료율/이탈 분석 예시 쿼리

```sql
-- sl_session_start 대비 sl_stage_enter(done) 비율 = 완료율
SELECT
  COUNT(DISTINCT CASE WHEN event_name = 'sl_session_start'
        THEN (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'session_id')
        END) AS sessions_started,
  COUNT(DISTINCT CASE WHEN event_name = 'sl_stage_enter'
        AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'stage') = 'done'
        THEN (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'session_id')
        END) AS sessions_completed,
  ROUND(
    COUNT(DISTINCT CASE WHEN event_name = 'sl_stage_enter'
          AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'stage') = 'done'
          THEN (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'session_id')
          END) * 100.0 /
    NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'sl_session_start'
           THEN (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'session_id')
           END), 0),
  1) AS completion_rate_pct
FROM `프로젝트ID.analytics_PROPERTY_ID.events_*`
WHERE _TABLE_SUFFIX BETWEEN '20260101' AND '20261231';
```

### 3-e. 비용 주의

BigQuery 무료 할당량: 쿼리 1TB/월 무료, 스토리지 10GB/월 무료.
초기 트래픽이 적은 MVP 단계에서는 무료 범위 내에서 운영 가능하다.
스트리밍 내보내기는 별도 비용이 발생하므로 **매일** 옵션을 권장한다.

---

## 4. 수집 이벤트 목록 (참조)

`src/lib/analytics.ts` 의 래퍼 모듈이 전송하는 커스텀 이벤트:

| 이벤트 이름 | 발생 지점 | 주요 파라미터 |
|---|---|---|
| `sl_session_start` | 학습 시작 (input -> probe 전환) | session_id, concept, mode |
| `sl_stage_enter` | 각 단계 진입 (probe/learn/done) | session_id, stage |
| `sl_step_enter` | learn 단계 스텝 진입 | session_id, step_idx |
| `sl_answer_submit` | 답변 제출 | session_id, step_idx, question_id |
| `sl_answer_edit` | 답변 수정 | session_id, step_idx, question_id |
| `sl_branch_select` | 분기 선택 | session_id, step_idx, choice |
| `sl_step_navigate` | 스텝 이동 | session_id, from_idx, to_idx, direction |

> **중요**: 위 이벤트는 `import.meta.env.PROD && !VITE_AUTH_EMULATOR_URL && !VITE_E2E_AUTO_SIGNIN`
> 조건이 참일 때만 실제 GA4 로 전송된다. 개발/에뮬레이터/E2E 환경에서는 no-op.

---

## 완료 체크

- [ ] 1. `measurementId` 확보 및 `frontend/.env.local` 에 `VITE_FIREBASE_MEASUREMENT_ID` 추가
- [ ] 2. GA4 커스텀 디멘션 10개 등록 (session_id, concept, mode, stage, step_idx, question_id, choice, from_idx, to_idx, direction)
- [ ] 3. BigQuery 연결 (매일 내보내기, 적절한 GCP 프로젝트 + 리전 선택)
- [ ] 4. 연결 익일 `events_YYYYMMDD` 테이블 생성 확인
