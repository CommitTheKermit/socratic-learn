// Sidebar — full version + collapsed "rail" version (for the reader layout).

function Sidebar({ layout, currentTitle, currentStage }) {
  if (layout === 'reader') return <SidebarRail />;
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">S</div>
        <div>
          <div className="brand-name">Socratic</div>
          <div className="brand-tag">learn ⌁ v0.4</div>
        </div>
      </div>

      <button className="btn-new" type="button">
        <Icon name="plus" size={14} />
        새 학습 시작
        <span className="kbd">⌘N</span>
      </button>

      <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="section-label">최근 학습</div>
        <div className="session-list">
          {SESSION_LIST.map((s) => (
            <button key={s.id}
                    className={'session-item' + (s.isActive ? ' is-active' : '')}>
              <span className="session-title">
                {s.isActive ? currentTitle : s.title}
              </span>
              <span className="session-meta">
                <span>{s.topic}</span>
                <span className="dot" />
                <span>{s.time}</span>
                {s.isActive && currentStage && (
                  <>
                    <span className="dot" />
                    <span>{currentStage}</span>
                  </>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div className="sidebar-footer">
        <div className="avatar">한</div>
        <div style={{ minWidth: 0 }}>
          <div className="user-name">한지수</div>
          <div className="user-meta">14.2k / 60k tok</div>
        </div>
        <button className="icon-btn" aria-label="설정">
          <Icon name="settings" />
        </button>
      </div>
    </aside>
  );
}

function SidebarRail() {
  return (
    <aside className="sidebar is-rail">
      <div className="brand-mark" title="Socratic">S</div>
      <button className="btn-new-rail" type="button" aria-label="새 학습 시작">
        <Icon name="plus" />
      </button>
      <button className="rail-icon is-active" aria-label="학습">
        <Icon name="book" />
      </button>
      <button className="rail-icon" aria-label="최근">
        <Icon name="history" />
      </button>
      <button className="rail-icon" aria-label="검색">
        <Icon name="search" />
      </button>
      <div style={{ flex: 1 }} />
      <button className="rail-icon" aria-label="설정">
        <Icon name="settings" />
      </button>
      <div className="avatar" title="한지수">한</div>
    </aside>
  );
}

window.Sidebar = Sidebar;
