import { CHANGELOG, CHANGE_CATEGORY } from "./changelog";
import "./whatsnew.css";

/** 공용 닫기(×) 아이콘. */
function WnX() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

/**
 * 업데이트 소식 패널 (시안 D - 아이콘 선두 글리프 배지).
 *
 * 헤더는 "업데이트 소식" 제목만(아이브로우/서브 문구 없음), 분류 타이틀은 흰색이고
 * 색 구분은 좌측 글리프 배지로만 한다. 맨 위(최신) 버전에 NEW 배지가 붙는다.
 */
export function WhatsNewPanel({ onClose }: { onClose?: () => void }) {
  return (
    <div className="wn-panel">
      <div className="wn-head">
        <div className="wn-head-titles">
          <h2 className="wn-title">업데이트 소식</h2>
        </div>
        <span className="wn-spacer" />
        <button className="wn-close" type="button" aria-label="닫기" onClick={onClose}>
          <WnX />
        </button>
      </div>

      <div className="wn-scroll">
        {CHANGELOG.map((ver, vi) => (
          <div className="wnD-group" key={ver.version}>
            <div className="wnD-vhead">
              <span className="wn-ver">v{ver.version}</span>
              {vi === 0 && <span className="wn-newpill">NEW</span>}
              <span className="wn-date">{ver.date}</span>
            </div>
            <div className="wnD-items">
              {ver.changes.map((c, i) => {
                const cat = CHANGE_CATEGORY[c.type];
                return (
                  <div className="wnD-item" key={i}>
                    <span className={"wnD-badge wnD-badge--" + c.type}>{cat.glyph}</span>
                    <span className="wnD-body">
                      <span className={"wnD-catname wnD-catname--" + c.type}>{cat.full}</span>
                      <span className="wnD-text">{c.text}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
