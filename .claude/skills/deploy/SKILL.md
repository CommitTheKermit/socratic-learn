---
name: deploy
description: socratic-learn-web(Firebase) 배포를 한 번에 안전하게 수행한다. main 브랜치 확인·미머지 feat 브랜치 점검·최신 버전 확인·SemVer bump·functions/frontend 빌드·firebase deploy·release 커밋·push 까지 CLAUDE.md 배포 규칙을 그대로 인코딩한다. 사용자가 "배포", "배포 슛", "배포 부탁", "deploy", "릴리스", "개시" 같은 표현으로 배포를 요청할 때 발동.
---

# deploy

socratic-learn-2 의 배포(Firebase Functions + Hosting)를 **사전 점검 -> 빌드 -> 배포 -> release 커밋 -> push** 한 흐름으로 끝낸다. CLAUDE.md "배포" 섹션이 단일 진실 출처이며, 이 스킬은 그 절차를 그대로 실행하면서 과거에 반복된 사고(작업 브랜치에서 배포, 머지 안 된 기능 브랜치 누락, 버전 상태 착오)를 사전 점검 단계에서 막는다.

전제: 배포는 **사용자가 명시적으로 요청할 때만** 한다(자동 배포 금지). 이 스킬이 호출됐다는 것 자체가 명시적 요청이다.

## 0. 사전 점검 (사고 예방 - 건너뛰지 말 것)

배포 명령을 실행하기 전에 아래를 순서대로 확인하고, 어긋나면 멈추고 사용자에게 알린다.

1. **현재 브랜치가 main 인가**
   ```bash
   git rev-parse --abbrev-ref HEAD
   ```
   - main 이 아니면 배포하지 않는다. 작업 브랜치(`feat/*` 등)를 먼저 main 으로 병합한다:
     `git switch main && git merge --no-ff <작업브랜치>` (또는 사용자 지시대로). 병합 후 다시 1번부터.
   - (가드 훅이 설치돼 있으면 main 이 아닌 곳의 `firebase deploy` 는 하드 차단된다.)

2. **원격과 동기화 + 미머지 기능 브랜치 점검** (과거: 배포에 특정 기능 브랜치가 안 들어간 사고)
   ```bash
   git fetch origin --prune
   git log --oneline origin/main..main      # 로컬 main 의 미푸시 커밋
   git log --oneline main..origin/main      # 당겨와야 할 원격 커밋
   git branch --no-merged main              # main 에 아직 안 들어온 로컬 브랜치
   ```
   - `git branch --no-merged main` 결과에 **이번 배포에 포함돼야 할 기능 브랜치**가 있으면, 그것부터 main 으로 병합한 뒤 진행한다. 판단이 모호하면 사용자에게 "이 브랜치들도 배포에 포함하나요?"라고 확인한다.
   - 미푸시 커밋이 있으면 push 후 진행(`git push`). 미당김 커밋이 있으면 먼저 정리한다.

3. **최신 버전 확인** (과거: 옛 버전 기준으로 진행한 착오)
   ```bash
   git log -1 --format='%H %s' main         # main 최신 커밋
   ```
   - 앱 버전 단일 출처는 **`frontend/package.json` 의 `version`** 한 곳뿐이다(functions/root 엔 버전 없음). 현재 값을 읽고, 직전 release 이후 변경 성격으로 다음 버전을 정한다(아래 1번).

## 1. 버전 bump

- 증가 단위는 SemVer 로 변경 성격에 따라 판단한다: 호환 깨짐=major, 호환되는 기능 추가=minor, 호환되는 버그 수정=patch.
- **`frontend/package.json` 의 `version` 만** 수정한다. (이 값이 프런트 빌드에 반영되므로 빌드 전에 올린다.)

## 1.5 changelog 갱신 (업데이트 소식)

사용자에게 "업데이트 소식" 패널로 노출되는 변경 내역을 **빌드(step 2) 전에** 갱신한다. 그래야 배포되는 frontend 번들에 새 항목이 인라인되어 배포 직후 노출된다. 출처는 `frontend/src/components/whatsnew/changelog.ts` 한 곳이다.

1. 직전 release 이후 커밋을 모은다:
   ```bash
   git log --oneline --grep '^chore(release)' -1      # 직전 release 커밋 찾기
   git log <그 커밋>..HEAD --oneline                   # 이후 변경 목록
   ```
2. AI(클로드)가 그 커밋들을 근거로 **사용자 관점 changelog 항목을 직접 작성**한다(git log 를 기계적으로 복사하지 않는다).
   - `CHANGELOG` 배열 맨 앞(index 0)에 새 `VersionEntry` 하나를 prepend.
   - `version` 은 step 1 에서 올린 `frontend/package.json` 의 version 과 **똑같이** 맞춘다.
   - `date` 는 배포일을 `"YYYY.MM.DD"` 로.
   - `changes` 는 각 항목 `{ type, text }`. `type` 은 `feature`(기능 추가)/`improve`(개선)/`fix`(버그 수정) 중 하나, `text` 는 사용자 관점의 짧은 한 문장.
   - 한 버전 안에서 항목은 **`feature` → `improve` → `fix` 순서**로 정렬한다(기능 추가를 위에, 버그 수정을 아래에).
   - **내부 도구/하네스/CI/문서/리팩터 등 사용자 체감이 없는 변경은 제외**한다.
3. 작성된 초안을 사람이 **검토/승인**한다(문구·분류·누락 확인). 수정 요청이 있으면 반영 후 다시 확인.
4. **사용자 관점 변경이 0건이면 항목을 생략**한다(빈 항목을 만들지 않는다). 이 경우 `CHANGELOG[0]` 이 그대로라 빨간 점(미확인 알림)도 켜지지 않는다. changelog 의 버전 목록은 package.json 전체 버전의 부분집합일 수 있다(1:1 미러가 아니어도 된다).
5. **커밋은 분리하지 않는다.** `changelog.ts` 변경은 step 4 release 커밋에 `package.json` version bump 와 **함께** 담는다(별도 커밋 없음).
6. **검증 게이트 (빌드 직전 필수 - 건너뛰지 말 것).** changelog 갱신 누락을 막는 마지막 방어선이다. 빌드(step 2) 직전에 두 버전이 맞는지 기계적으로 확인한다:
   ```bash
   grep -oE 'version: "[0-9]+\.[0-9]+\.[0-9]+"' frontend/src/components/whatsnew/changelog.ts | head -1   # CHANGELOG[0]
   node -p "require('./frontend/package.json').version"                                                    # package.json
   ```
   - 두 값이 **일치**하면 통과.
   - **불일치**하면 멈춘다. 거의 항상 changelog 갱신을 빠뜨린 것이므로 2번으로 돌아가 항목을 추가한다. **유일한 예외**는 step 4 의 "사용자 체감 변경 0건이라 의도적으로 항목을 생략" 한 경우뿐이며, 이때만 불일치를 허용하고 진행한다(판단이 서지 않으면 사용자에게 확인).
   - 이 게이트는 **SKILL.md 를 옛 버전(예: 1.5 단계가 아직 머지 안 된 브랜치 기준)으로 읽어 changelog 갱신을 통째로 건너뛰는 사고**까지 잡는다. 그러니 이 게이트만큼은 어떤 경우에도 실행한다.

## 2. 빌드

```bash
cd functions && npm run build      # -> functions/lib/
cd frontend && npm run build       # -> frontend/dist/  (VITE_* 는 빌드 시점 인라인)
```
- 두 빌드가 모두 성공해야 다음으로 넘어간다. 실패 시 멈추고 원인을 보고한다.
- `VITE_*` 환경변수가 빌드 시점에 인라인되므로, 추적 ID 등 변경이 있었다면 빌드 전에 `.env`/`.env.local` 이 올바른지 확인한다.

## 3. 배포

루트에서:
```bash
npx firebase deploy --only functions,hosting
```
- 대상은 **functions + hosting**. firestore rules 변경이 이번 배포에 포함되면 `--only functions,hosting,firestore:rules` 로 넓힌다.
- 프로젝트는 `socratic-learn-web`(`.firebaserc`), region `us-central1`, 로그인 계정 `commit3921@gmail.com`. 인증이 풀려 있으면 사용자에게 `firebase login` 을 요청한다(`! firebase login`).
- 실배포 키는 Secret Manager 의 `ANTHROPIC_API_KEY`(emulator 전용 `functions/.secret.local` 아님).

## 4. release 커밋

- 배포 성공 후 **release-commit 스킬**의 고정 포맷으로 release 커밋을 남긴다(제목 `chore(release): vX.Y.Z 배포`, 본문 = 직전 release 이후 `git log` 기반 변경 목록 + 배포 대상 + 버전 증감).
- 이 커밋에는 **step 1 의 `package.json` version bump 와 step 1.5 의 `changelog.ts` 변경을 함께 담는다**(둘은 같은 릴리스 산출물이라 별도 커밋으로 나누지 않는다).
- 이 프로젝트 고유값: 본문 `대상:` 줄에 실제 배포 대상(functions/hosting, 필요 시 firestore rules), 본문 **맨 끝에** `Hosting URL: https://socratic-learn-web.web.app`.
- 서명 트레일러(Co-Authored-By 등) 없음, 한국어 본문.

## 5. push

```bash
git push
```
- release 커밋까지 원격에 올리고 마무리한다.

## 최종 순서 요약

작업 브랜치 커밋 -> main 으로 병합 -> push -> 버전 bump -> changelog 갱신(AI 작성 + 사람 검토) -> **버전 정합 검증 게이트** -> 빌드(functions, frontend) -> `firebase deploy --only functions,hosting` -> release 커밋(version + changelog 포함) -> push.
