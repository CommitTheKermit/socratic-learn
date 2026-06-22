// 부적합 입력 차단 모달(A: 학습 주제, D: 질문하기 공통).
// 우회 경로·사유 카테고리 없이 고정 일반 메시지 + 단일 "다시 입력" 액션만 제공한다(강제 재입력).
// retreat-dialog 스타일(styles/v3.css)을 재사용한다.

const INVALID_INPUT_MESSAGE = "학습에 사용할 수 있는 내용을 입력해 주세요.";

interface Props {
  /** 닫기(= 다시 입력). 호출자는 입력창에 포커스를 되돌린다. */
  onClose: () => void;
}

export function InvalidInputDialog({ onClose }: Props) {
  return (
    <div className="retreat-dialog-backdrop" role="dialog" aria-modal="true">
      <div className="retreat-dialog">
        <h3>다시 입력해 주세요</h3>
        <p className="retreat-reason">{INVALID_INPUT_MESSAGE}</p>
        <div className="retreat-actions">
          <button className="rd-primary" type="button" onClick={onClose} autoFocus>
            다시 입력
          </button>
        </div>
      </div>
    </div>
  );
}
