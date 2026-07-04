/**
 * 메인 화면(Hero) 학습 로드맵 데이터.
 * 대주제(major) → 중주제(mid) → 소주제(leaf) 3단 구조의 큐레이션 목록.
 * 중주제를 클릭하면 그 제목(t)이 입력창에 채워지고 학습이 시작된다(fill 은 참고용 상세 프롬프트).
 *
 * 정적 큐레이션 데이터다(서버/Firestore 아님). 디자인 핸드오프(app-prod.jsx ROADMAP)와 동일.
 */

/** 소주제(개별 개념). 중주제 행의 칩으로 나열된다. */
export interface RoadmapLeaf {
  /** 칩에 표시할 짧은 개념 이름. */
  t: string;
  /** 이 개념을 학습할 때 쓸 상세 프롬프트(현재 렌더에는 미사용, 향후 개별 진입용). */
  fill: string;
}

/** 중주제(학습 로드맵 한 줄). 클릭하면 t 로 학습을 시작한다. */
export interface RoadmapMid {
  /** 행 제목이자 클릭 시 입력창에 채워지는 개념. */
  t: string;
  /** 중주제 전체를 배우는 넓은 프롬프트(참고용). */
  fill: string;
  /** 선행 개념이 필요한 주제인지(현재 렌더에는 미사용). */
  prereq: boolean;
  /** 중주제 요약(현재 렌더에는 미사용). */
  desc: string;
  /** 포함 소주제 목록(행의 칩). */
  leaves: RoadmapLeaf[];
}

/** 대주제(좌측 레일 항목). */
export interface RoadmapMajor {
  id: string;
  name: string;
  mids: RoadmapMid[];
}

export const ROADMAP: RoadmapMajor[] = [
  {
    id: "android",
    name: "안드로이드",
    mids: [
      {
        t: "Jetpack Compose UI",
        fill: "Jetpack Compose로 선언형 UI를 배우고 싶어요",
        prereq: false,
        desc: "선언형 UI, 상태 호이스팅, 리컴포지션을 처음부터 익힌다.",
        leaves: [
          { t: "선언형 UI", fill: "Compose의 선언형 UI 개념" },
          { t: "컴포저블 함수", fill: "Composable 함수란 무엇인가요" },
          { t: "상태와 remember", fill: "remember로 상태를 기억하는 법" },
          { t: "상태 호이스팅", fill: "Compose에서 상태 호이스팅이 왜 필요한지" },
          { t: "리컴포지션", fill: "리컴포지션은 언제 일어나나요" },
          { t: "Modifier 체이닝", fill: "Modifier 체이닝의 동작 원리" },
        ],
      },
      {
        t: "데이터 & 상태",
        fill: "안드로이드 데이터와 상태 관리를 배우고 싶어요",
        prereq: true,
        desc: "화면 회전에도 살아남는 상태, StateFlow와 로컬 저장소를 다룬다.",
        leaves: [
          { t: "ViewModel", fill: "ViewModel이 화면 회전에도 살아남는 이유" },
          { t: "단방향 데이터 플로우", fill: "UI 상태를 단방향으로 흐리게 하는 법" },
          { t: "StateFlow", fill: "StateFlow로 UI 상태를 다루는 법" },
          { t: "Room", fill: "Room으로 로컬 DB를 다루는 법" },
          { t: "마이그레이션", fill: "Room 스키마 마이그레이션 처리" },
          { t: "DataStore", fill: "DataStore와 SharedPreferences의 차이" },
        ],
      },
      {
        t: "비동기 처리",
        fill: "안드로이드 비동기 처리를 배우고 싶어요",
        prereq: true,
        desc: "코루틴과 Flow로 안드로이드 비동기 처리를 익힌다.",
        leaves: [
          { t: "코루틴 기초", fill: "코루틴이 왜 필요한지" },
          { t: "suspend 함수", fill: "suspend 함수의 동작 원리" },
          { t: "디스패처", fill: "코루틴 디스패처의 종류와 역할" },
          { t: "Flow", fill: "Flow와 반응형 스트림의 개념" },
          { t: "구조적 동시성", fill: "구조적 동시성이 해결하는 문제" },
        ],
      },
    ],
  },
  {
    id: "kotlin",
    name: "코틀린",
    mids: [
      {
        t: "언어 기본",
        fill: "코틀린 언어의 기본기를 배우고 싶어요",
        prereq: false,
        desc: "Null 안정성, 데이터 클래스, 스마트 캐스트를 언어 관점에서 익힌다.",
        leaves: [
          { t: "Null 안정성", fill: "코틀린의 null 안정성은 어떻게 동작하나요" },
          { t: "데이터 클래스", fill: "데이터 클래스와 구조 분해 선언" },
          { t: "스마트 캐스트", fill: "스마트 캐스트가 동작하는 조건" },
          { t: "봉인 클래스", fill: "sealed class는 언제 쓰나요" },
        ],
      },
      {
        t: "함수형 스타일",
        fill: "코틀린의 함수형 스타일을 배우고 싶어요",
        prereq: true,
        desc: "람다와 고차 함수, 확장 함수, 스코프 함수를 다룬다.",
        leaves: [
          { t: "람다와 고차함수", fill: "고차 함수와 람다의 동작 방식" },
          { t: "확장 함수", fill: "확장 함수는 내부적으로 어떻게 동작하나요" },
          { t: "스코프 함수", fill: "let·run·apply·with의 차이" },
          { t: "컬렉션 연산", fill: "map·filter·fold 등 컬렉션 연산" },
        ],
      },
      {
        t: "동시성",
        fill: "코틀린 동시성을 배우고 싶어요",
        prereq: true,
        desc: "코루틴이 스레드보다 가벼운 이유부터 채널까지 이어본다.",
        leaves: [
          { t: "코루틴", fill: "코루틴이 스레드보다 가벼운 이유" },
          { t: "suspend 함수", fill: "suspend 함수는 어떻게 일시중단되나요" },
          { t: "Flow", fill: "Flow로 값의 흐름을 다루는 법" },
          { t: "채널", fill: "Channel과 Flow의 차이" },
        ],
      },
    ],
  },
  {
    id: "react",
    name: "리액트",
    mids: [
      {
        t: "핵심 개념",
        fill: "리액트의 핵심 개념을 배우고 싶어요",
        prereq: false,
        desc: "렌더링 원리, JSX, props와 state를 처음부터 익힌다.",
        leaves: [
          { t: "렌더링 원리", fill: "리액트의 렌더링과 리렌더링의 차이" },
          { t: "JSX", fill: "JSX는 무엇으로 변환되나요" },
          { t: "props와 state", fill: "props와 state의 차이" },
          { t: "단방향 흐름", fill: "리액트의 단방향 데이터 흐름" },
        ],
      },
      {
        t: "Hooks",
        fill: "리액트 Hooks를 배우고 싶어요",
        prereq: true,
        desc: "useState·useEffect·useMemo와 커스텀 훅을 원리로 파고든다.",
        leaves: [
          { t: "useState", fill: "useState는 어떻게 값을 기억하나요" },
          { t: "useEffect", fill: "useEffect 의존성 배열의 동작 원리" },
          { t: "useMemo", fill: "useMemo와 useCallback의 차이" },
          { t: "커스텀 훅", fill: "커스텀 훅은 어떻게 만드나요" },
        ],
      },
      {
        t: "성능",
        fill: "리액트 성능 최적화를 배우고 싶어요",
        prereq: true,
        desc: "메모이제이션, key와 재조정, 코드 스플리팅을 다룬다.",
        leaves: [
          { t: "메모이제이션", fill: "React.memo로 리렌더를 막는 법" },
          { t: "key와 재조정", fill: "리스트에서 key가 중요한 이유" },
          { t: "코드 스플리팅", fill: "코드 스플리팅과 lazy 로딩" },
          { t: "가상 DOM", fill: "가상 DOM은 어떻게 동작하나요" },
        ],
      },
    ],
  },
  {
    id: "cs",
    name: "CS 기초",
    mids: [
      {
        t: "자료구조",
        fill: "핵심 자료구조를 배우고 싶어요",
        prereq: false,
        desc: "해시 테이블, 트리, 그래프, 힙을 동작 원리로 익힌다.",
        leaves: [
          { t: "해시 테이블", fill: "해시 테이블의 충돌 처리 방법" },
          { t: "트리", fill: "이진 탐색 트리의 동작 원리" },
          { t: "그래프", fill: "그래프 탐색 BFS와 DFS의 차이" },
          { t: "힙", fill: "힙으로 우선순위 큐를 만드는 법" },
        ],
      },
      {
        t: "운영체제",
        fill: "운영체제 기초를 배우고 싶어요",
        prereq: true,
        desc: "프로세스와 스레드, 스케줄링, 가상 메모리를 다룬다.",
        leaves: [
          { t: "프로세스 vs 스레드", fill: "프로세스와 스레드의 차이" },
          { t: "스케줄링", fill: "CPU 스케줄링 알고리즘의 종류" },
          { t: "가상 메모리", fill: "가상 메모리와 페이징의 원리" },
          { t: "동기화", fill: "뮤텍스와 세마포어의 차이" },
        ],
      },
      {
        t: "네트워크",
        fill: "네트워크 기초를 배우고 싶어요",
        prereq: true,
        desc: "TCP/UDP, 혼잡 제어, HTTP, DNS를 흐름 중심으로 익힌다.",
        leaves: [
          { t: "TCP/UDP", fill: "TCP와 UDP의 차이" },
          { t: "혼잡 제어", fill: "TCP 혼잡 제어는 어떻게 동작하나요" },
          { t: "HTTP", fill: "HTTP 요청-응답의 흐름" },
          { t: "DNS", fill: "DNS 이름 해석 과정" },
        ],
      },
    ],
  },
];
