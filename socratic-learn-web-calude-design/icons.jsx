// Tiny inline-SVG icon set. Stroke-based, 16px nominal.
const Icon = ({ name, size = 16, className }) => {
  const s = { width: size, height: size, fill: 'none', stroke: 'currentColor',
              strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const wrap = (children) => (
    <svg viewBox="0 0 16 16" {...s} className={className} aria-hidden="true">{children}</svg>
  );
  switch (name) {
    case 'plus':       return wrap(<><path d="M8 3v10M3 8h10" /></>);
    case 'search':     return wrap(<><circle cx="7" cy="7" r="4" /><path d="m10.2 10.2 3 3" /></>);
    case 'history':    return wrap(<><path d="M3 8a5 5 0 1 0 1.5-3.6L3 6" /><path d="M3 3v3h3" /><path d="M8 6v2.5l1.8 1" /></>);
    case 'settings':   return wrap(<><circle cx="8" cy="8" r="2" /><path d="M8 1.5v1.5M8 13v1.5M2.7 2.7l1.1 1.1M12.2 12.2l1.1 1.1M1.5 8H3M13 8h1.5M2.7 13.3l1.1-1.1M12.2 3.8l1.1-1.1" /></>);
    case 'arrow-r':    return wrap(<><path d="M3.5 8h9M9 4.5l3.5 3.5L9 11.5" /></>);
    case 'arrow-down': return wrap(<><path d="M8 3.5v9M4.5 9l3.5 3.5L11.5 9" /></>);
    case 'sparkle':    return wrap(<><path d="M8 2.5 9 6l3.5 1L9 8l-1 3.5L7 8 3.5 7 7 6z" /></>);
    case 'send':       return wrap(<><path d="m2.5 8 11-5-4 11-2.5-4.5z" /><path d="m7 9 2.5-3.5" /></>);
    case 'check':      return wrap(<><path d="m3.5 8.5 3 3 6-7" /></>);
    case 'x':          return wrap(<><path d="m4 4 8 8M12 4l-8 8" /></>);
    case 'edit':       return wrap(<><path d="M3 13h10" /><path d="M10.5 3.5 12.5 5.5 6 12l-3 1 1-3z" /></>);
    case 'redo':       return wrap(<><path d="M13 8a5 5 0 1 1-1.5-3.6L13 6" /><path d="M13 3v3h-3" /></>);
    case 'code':       return wrap(<><path d="M5 5 2 8l3 3M11 5l3 3-3 3M9.5 3.5 6.5 12.5" /></>);
    case 'next':       return wrap(<><path d="M3.5 4 8.5 8l-5 4M8.5 4l5 4-5 4" /></>);
    case 'menu':       return wrap(<><path d="M2.5 4h11M2.5 8h11M2.5 12h11" /></>);
    case 'book':       return wrap(<><path d="M3 3.5h4.5a1.5 1.5 0 0 1 1.5 1.5v8a1 1 0 0 0-1-1H3z" /><path d="M13 3.5H8.5A1.5 1.5 0 0 0 7 5v8a1 1 0 0 1 1-1h5z" /></>);
    case 'caret-r':    return wrap(<><path d="m6 4 4 4-4 4" /></>);
    case 'help':       return wrap(<><circle cx="8" cy="8" r="6" /><path d="M6.5 6.2c.2-1 1.1-1.7 2-1.5 1 .2 1.5 1.1 1.3 2-.1.8-1 1-1.3 1.3-.4.4-.5.7-.5 1.3M8 11.5h.01" /></>);
    default: return null;
  }
};

window.Icon = Icon;
