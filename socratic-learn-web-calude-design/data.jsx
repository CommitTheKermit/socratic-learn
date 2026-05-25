// Mock content for the prototype — Korean copy about 코루틴.

const SESSION_LIST = [
  { id: 's1', title: "코루틴이 왜 필요한지", time: "방금", topic: "Concurrency", isActive: true, progress: "진행중" },
  { id: 's2', title: "B+ Tree vs LSM-Tree 인덱스", time: "어제", topic: "DB", progress: "복습" },
  { id: 's3', title: "React useEffect cleanup 시점", time: "2일 전", topic: "React", progress: "완료" },
  { id: 's4', title: "TCP 3-way handshake 의미", time: "3일 전", topic: "Network", progress: "완료" },
  { id: 's5', title: "Cache-line false sharing", time: "5일 전", topic: "Systems", progress: "보류" },
  { id: 's6', title: "동시성과 병렬성의 차이", time: "지난주", topic: "Concurrency", progress: "완료" },
];

// Explanation body — rendered token-by-token during streaming, fully rendered when ready.
// Structured as blocks so the streaming animation can reveal one block at a time.
const EXPLANATION_BLOCKS = [
  { type: 'p', text: "코루틴은 **함수를 도중에 멈췄다가 다시 이어서 실행할 수 있는 도구**예요. 한 마디로 정리하면 *“값싸게 멈췄다 깰 수 있는 함수”*입니다." },
  { type: 'p', text: "왜 굳이 필요할까요? 네트워크 요청·디스크 I/O·외부 API 호출처럼 **기다리는 시간이 긴 작업**을 다룰 때, 스레드 하나가 그 시간 동안 통째로 멈춰 있으면 너무 아깝습니다. 그렇다고 매번 OS 스레드를 띄우자니 비용이 크고요." },
  { type: 'h3', text: "스레드와 비교" },
  { type: 'table', rows: [
    ['차원', 'OS 스레드', '코루틴'],
    ['생성 비용', '수 KB ~ MB의 스택', '수십~수백 바이트'],
    ['전환 비용', '커널 스케줄러 개입', '함수 호출 수준'],
    ['동시 1만개', '거의 불가능', '쉽게 가능'],
  ]},
  { type: 'p', text: "핵심은 **suspension point**입니다. `await` 같은 표시를 만나는 순간, 코루틴은 **자기 상태를 작은 객체에 저장하고** 스레드에서 내려옵니다. 스레드는 곧바로 다른 일을 합니다. 결과가 준비되면 저장해둔 상태에서 정확히 그 자리부터 다시 깨어나죠." },
  { type: 'code', lang: 'kotlin', html:
    `<span class="cm">// 두 API를 동시에 호출하고 합치는 흔한 패턴</span>
<span class="kw">suspend fun</span> <span class="fn">loadProfile</span>(id: <span class="kw">Long</span>): Profile = coroutineScope {
    <span class="kw">val</span> user  = async { api.<span class="fn">user</span>(id) }    <span class="cm">// 멈춰도 스레드 안 막힘</span>
    <span class="kw">val</span> posts = async { api.<span class="fn">posts</span>(id) }
    <span class="fn">Profile</span>(user.<span class="fn">await</span>(), posts.<span class="fn">await</span>())
}` },
  { type: 'p', text: "결과적으로 같은 머신에서 **수만 개의 동시 요청**을 큰 사고 없이 받아낼 수 있게 됩니다. 핵심은 “많은 일을 동시에 굴린다”가 아니라, **“기다리는 시간을 낭비하지 않는다”** 쪽에 가깝습니다." },
];

const QUESTIONS = [
  {
    id: 'q1',
    text: "OS 스레드 1만 개를 만드는 건 어려운데 코루틴 1만 개는 보통 어렵지 않아요. 가장 큰 이유 하나를 한 줄로 적어 주세요.",
    placeholder: "예: 코루틴은 스택을 통째로 갖지 않아서…",
    hint: "메모리/스택 관점에서 생각해 보세요.",
    sample: "각 코루틴이 자기 상태를 작은 객체로만 가져서 스택 메모리 비용이 거의 들지 않기 때문",
    verdict: 'ok',
    feedback: "정확해요. 스레드가 보통 **1~수 MB 스택**을 요구하는 반면, 코루틴은 *suspension 객체*에 필요한 변수만 담아 들고 다닙니다. 그래서 1만 개도 가뿐히 띄울 수 있어요.",
  },
  {
    id: 'q2',
    text: "`await`를 만났을 때 정확히 어떤 일이 일어나나요? “스레드가 멈춘다”는 말은 왜 부정확한지 함께 적어 보세요.",
    placeholder: "코루틴은 …, 그동안 스레드는 …",
    hint: "주체를 분리해서 적으면 쉬워져요.",
    sample: "코루틴은 자기 상태를 저장한 채로 스레드에서 내려오고, 스레드는 그 사이 다른 코루틴을 실행한다",
    verdict: 'warn',
    feedback: "방향은 맞아요. 다만 *주체*가 흐려져 있어요. **멈추는 건 코루틴**이고, **스레드는 멈추지 않습니다** — 다른 일을 합니다. 이 분리가 “스레드 효율”이라는 표현의 진짜 의미예요.",
  },
  {
    id: 'q3',
    text: "그렇다면 CPU를 계속 쓰는 무거운 계산 작업을 코루틴으로 바꾸면 빨라질까요? Yes/No와 이유 한 줄을 적어 주세요.",
    placeholder: "예: 아니오. 왜냐하면…",
    hint: "코루틴이 해결하는 문제와 그렇지 않은 문제를 구분해 보세요.",
    verdict: null,
    feedback: null,
    skipped: true,
  },
];

const BRANCHES = [
  {
    id: 'b1',
    title: "오해한 부분 다시 보기",
    body: "‘스레드가 멈춘다’는 표현부터 다시 짚어요. 2번 질문에서 흐릿했던 주체-분리 모델만 좁게 다시 풀어 드릴게요.",
    meta: "2번 보강 · 약 2분",
    icon: 'redo',
    recommended: true,
  },
  {
    id: 'b2',
    title: "예제로 보기",
    body: "Kotlin · Python · Go에서 동일한 “API 2개 동시 호출” 패턴이 어떻게 표현되는지 짧게 비교합니다.",
    meta: "코드 3개 · 약 3분",
    icon: 'code',
  },
  {
    id: 'b3',
    title: "다음 개념으로",
    body: "이번 흐름에서 자연스럽게 이어지는 주제 — `suspend`가 컴파일러에서 어떤 상태 기계로 바뀌는지.",
    meta: "다음 세션 시작",
    icon: 'next',
  },
];

Object.assign(window, { SESSION_LIST, EXPLANATION_BLOCKS, QUESTIONS, BRANCHES });
