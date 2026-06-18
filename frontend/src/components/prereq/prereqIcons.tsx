/* 선행 개념 트리 UI 아이콘 — Claude Design prereq-parts.jsx 의 PI 를 그대로 이식.
   재사용 가능한 React 엘리먼트 레코드(동일 엘리먼트를 여러 곳에서 렌더해도 무방). */
import type { ReactElement } from "react";

const Ico = ({ d, size = 18, sw = 1.7 }: { d: ReactElement; size?: number; sw?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {d}
  </svg>
);

export const PI: Record<string, ReactElement> = {
  brand: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v18M12 8c0-2.8 2.2-5 5-5M12 13c0-2.8 2.2-5 5-5M12 11c0-2.8-2.2-5-5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  branch: (
    <Ico
      size={16}
      d={
        <>
          <circle cx="12" cy="5" r="2.2" />
          <circle cx="6" cy="19" r="2.2" />
          <circle cx="18" cy="19" r="2.2" />
          <path d="M12 7.2v3.3c0 1.5-1 2-2.4 2.8C8 14.2 6 15 6 16.8M12 10.5c0 1.5 1 2 2.4 2.8C16 14.2 18 15 18 16.8" />
        </>
      }
    />
  ),
  x: <Ico size={16} d={<path d="M6 6l12 12M18 6L6 18" />} />,
  arrowR: (
    <Ico
      size={15}
      d={
        <>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </>
      }
    />
  ),
  refresh: (
    <Ico
      size={14}
      d={
        <>
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          <path d="M3 21v-5h5" />
        </>
      }
    />
  ),
  play: <Ico size={13} d={<path d="M7 5l11 7-11 7V5z" fill="currentColor" stroke="none" />} />,
  plus: <Ico size={14} d={<path d="M12 5v14M5 12h14" />} />,
  check: <Ico size={14} d={<path d="M20 6L9 17l-5-5" />} />,
  alert: (
    <Ico
      size={22}
      d={
        <>
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </>
      }
    />
  ),
  leaf: (
    <Ico
      size={22}
      d={
        <>
          <path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 16-9 0 8-4 12-9 12Z" />
          <path d="M4 21c2-4 5-7 9-9" />
        </>
      }
    />
  ),
  back: (
    <Ico
      size={15}
      d={
        <>
          <path d="M19 12H5" />
          <path d="m11 18-6-6 6-6" />
        </>
      }
    />
  ),
  newLearn: <Ico size={16} d={<path d="M12 5v14M5 12h14" />} />,
};
