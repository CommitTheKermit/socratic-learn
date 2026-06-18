/** 선행 개념 트리 기능을 learn/probe 스테이지로 내려보내는 컨트롤 묶음. App 이 구현해 주입한다. */
export interface PrereqStageControls {
  /** 현재 세션의 부모 체인 깊이(원개념=0, 하위=1, 하위의 하위=2=한계). */
  depth: number;
  /** 하위 세션이면 부모(상위) 개념명. 최상위면 undefined. */
  parentConcept?: string;
  /** "선행 개념 보기" — 선행 트리 모달 열기(+트리 생성). */
  onOpen: () => void;
  /** 상위(부모) 개념 세션으로 복귀. */
  onReturnToParent: () => void;
  /** 깊이 2 한계에서 "새 학습으로 시작"(부모 없는 독립 새 세션). */
  onNewIndependent: () => void;
}
