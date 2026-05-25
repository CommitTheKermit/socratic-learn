// Streaming explanation + questions + review feedback + branch cards.

// inline markdown — **bold**, *italic*, `code`. Escapes HTML.
function inlineFmt(text) {
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  return esc(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

// ── Streaming explanation ────────────────────────────────────────────────
// `progress` is a float 0..1 over the full block sequence. Past blocks render
// in full; the in-flight block reveals a portion of its text char-by-char.
function ExplanationCard({ blocks, progress, isLive, onJumpDone }) {
  const N = blocks.length;
  const fullIdx = Math.floor(progress * N);
  const frac = (progress * N) - fullIdx;

  return (
    <div className="card">
      <div className="card-head">
        <span className={'label' + (isLive ? ' is-live' : '')}>
          {isLive ? '설명 생성 중' : '설명 · 코루틴이 왜 필요한지'}
        </span>
        <div className="spacer" />
        {isLive ? (
          <button className="mini-btn" type="button" onClick={onJumpDone}>
            <Icon name="arrow-down" size={13} /> 끝으로
          </button>
        ) : (
          <>
            <button className="mini-btn" type="button">
              <Icon name="help" size={13} /> 더 쉽게
            </button>
            <button className="mini-btn" type="button">
              <Icon name="edit" size={13} /> 메모
            </button>
          </>
        )}
      </div>

      <div className="prose">
        {blocks.map((b, i) => {
          if (i < fullIdx) return <Block key={i} block={b} reveal={1} />;
          if (i === fullIdx && isLive) {
            return <Block key={i} block={b} reveal={frac} showCursor />;
          }
          if (i === fullIdx && !isLive) return <Block key={i} block={b} reveal={1} />;
          if (!isLive) return <Block key={i} block={b} reveal={1} />;
          return null;
        })}
      </div>
    </div>
  );
}

function Block({ block, reveal, showCursor }) {
  if (block.type === 'p') {
    const text = block.text;
    const visible = reveal >= 1 ? text : text.slice(0, Math.max(0, Math.floor(text.length * reveal)));
    return (
      <p className="fade-in"
         dangerouslySetInnerHTML={{
           __html: inlineFmt(visible) + (showCursor ? '<span class="stream-cursor"></span>' : '')
         }} />
    );
  }
  if (block.type === 'h3') {
    return <h3 className="fade-in">{block.text}</h3>;
  }
  if (block.type === 'table') {
    return (
      <div className="compare-table fade-in">
        {block.rows.map((row, i) => (
          <div key={i} className={'compare-table-row' + (i === 0 ? ' compare-table-head' : '')}>
            {row.map((cell, j) => (
              <div key={j} className={j === 0 && i > 0 ? 'label-cell' : ''}>{cell}</div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (block.type === 'code') {
    return (
      <pre className="fade-in"><code dangerouslySetInnerHTML={{ __html: block.html }} /></pre>
    );
  }
  return null;
}

// ── Question card ───────────────────────────────────────────────────────
function QuestionCard({ q, index, answer, skipped, isFocus, isReviewed, onAnswer, onToggleSkip, onFocus }) {
  const verdictClass = isReviewed && q.verdict ? ` is-${({ ok: 'correct', warn: 'partial', bad: 'wrong' }[q.verdict])}` : '';
  return (
    <div className={'q-card' + (isFocus ? ' is-focus' : '') + (skipped ? ' is-skipped' : '') + verdictClass}
         onClick={onFocus}>
      <div className="q-num">
        <span className="n">Q{index + 1}</span>
      </div>
      <div className="q-body">
        <p className="q-text" dangerouslySetInnerHTML={{ __html: inlineFmt(q.text) }} />

        {!isReviewed && (
          <>
            <textarea
              className="q-input"
              placeholder={skipped ? '“모르겠어요”로 표시했어요. 다시 답해도 됩니다.' : q.placeholder}
              value={answer}
              onChange={(e) => onAnswer(e.target.value)}
              onFocus={onFocus}
              disabled={skipped}
              rows={2}
            />
            <div className="q-foot">
              <span className="count-mono">{answer.length} / 자유 입력</span>
              <span className="spacer" />
              <span className="count-mono" style={{ opacity: .8 }}>{q.hint}</span>
              <button className={'skip-toggle' + (skipped ? ' is-on' : '')}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onToggleSkip(); }}>
                <span className="check"><Icon name="check" size={10} /></span>
                모르겠어요
              </button>
            </div>
          </>
        )}

        {isReviewed && (
          <>
            <div className="q-input" style={{ background: 'var(--surface-2)', minHeight: 'auto', color: 'var(--text-muted)' }}>
              {skipped ? <em style={{ color: 'var(--text-soft)' }}>모르겠어요로 표시</em> : (answer || <em style={{ color: 'var(--text-soft)' }}>(답변 없음)</em>)}
            </div>
            {q.feedback && (
              <div className={'q-feedback ' + ({ ok: 'ok', warn: 'warn', bad: 'bad' }[q.verdict] || '')}>
                <span className="verdict">
                  {{ ok: '정확', warn: '부분', bad: '오해' }[q.verdict] || '확인'}
                </span>
                <span className="text" dangerouslySetInnerHTML={{ __html: inlineFmt(q.feedback) }} />
              </div>
            )}
            {skipped && !q.feedback && (
              <div className="q-feedback warn">
                <span className="verdict">힌트</span>
                <span className="text">짧게라도 적어 보면 다음 분기에서 *‘오해 다시 보기’* 카드가 더 정확해져요. 다시 답해도 좋습니다.</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Review summary banner ───────────────────────────────────────────────
function ReviewBanner({ stats }) {
  return (
    <div className="review-banner">
      <div className="review-score">
        <div>
          <b>{stats.score}</b>
          <div style={{ fontSize: 10, marginTop: 2, opacity: .8 }}>/100</div>
        </div>
      </div>
      <div className="review-text">
        <h3>대체로 잘 이해했어요. 한 군데만 흐릿합니다.</h3>
        <p>2번 질문의 **주체 분리** — 멈추는 건 *코루틴*, 스레드는 멈추지 않는다 — 만 다시 짚으면 충분해요.</p>
      </div>
      <div className="review-stats">
        <div className="stat ok"><b>{stats.ok}</b>정확</div>
        <div className="stat warn"><b>{stats.warn}</b>부분</div>
        <div className="stat bad"><b>{stats.bad}</b>오해</div>
      </div>
    </div>
  );
}

// ── Branch cards ─────────────────────────────────────────────────────────
function BranchGrid({ branches }) {
  return (
    <div className="branch-section">
      <div className="branch-section-head">
        <h3>다음 학습 방향</h3>
        <span className="sub">하나만 골라 주세요 — 언제든 사이드바에서 돌아올 수 있어요.</span>
      </div>
      <div className="branch-grid">
        {branches.map((b) => (
          <button key={b.id} className={'branch' + (b.recommended ? ' is-rec' : '')} type="button">
            <span className="ico"><Icon name={b.icon} size={14} /></span>
            <h4>{b.title}</h4>
            <p>{b.body}</p>
            <div className="meta">{b.meta}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ExplanationCard, QuestionCard, ReviewBanner, BranchGrid });
