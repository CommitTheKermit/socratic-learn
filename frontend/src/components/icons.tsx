import type { ReactNode } from "react";

type IcoProps = { d: ReactNode; size?: number };
const Ico = ({ d, size = 16 }: IcoProps) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {d}
  </svg>
);

export const I = {
  brand: (
    <Ico
      d={
        <>
          <path d="M3 12c4 0 6-3 9-3s5 3 9 3" />
          <path d="M3 17c4 0 6-3 9-3s5 3 9 3" />
        </>
      }
    />
  ),
  sidebar: (
    <Ico
      d={
        <>
          <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
          <path d="M9.5 4.5v15" />
        </>
      }
    />
  ),
  capture: (
    <Ico
      d={
        <>
          <path d="M5 8h2l1.5-2h7L17 8h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
          <circle cx="12" cy="13" r="3.5" />
        </>
      }
    />
  ),
  archive: (
    <Ico
      d={
        <>
          <rect x="3" y="4" width="18" height="4.5" rx="1.5" />
          <path d="M4.5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h12A1.5 1.5 0 0 0 19.5 19V8.5" />
          <path d="M10 12h4" />
        </>
      }
    />
  ),
  folder: (
    <Ico
      d={
        <>
          <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5V7.5Z" />
        </>
      }
    />
  ),
  history: (
    <Ico
      d={
        <>
          <path d="M4 12a8 8 0 1 0 2.5-5.8L4 9" />
          <path d="M4 4v5h5" />
          <path d="M12 8v4l3 2" />
        </>
      }
    />
  ),
  chevSmall: (
    <Ico
      size={14}
      d={
        <>
          <path d="m6 9 6 6 6-6" />
        </>
      }
    />
  ),
  figma: (
    <Ico
      size={14}
      d={
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M9 5h3v7H9a3.5 3.5 0 0 1 0-7Z" />
          <path d="M12 5h3a3.5 3.5 0 0 1 0 7h-3" />
          <path d="M12 12H9a3.5 3.5 0 0 0 0 7c2 0 3-1.5 3-3.5V12Z" />
        </>
      }
    />
  ),
  image: (
    <Ico
      size={14}
      d={
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="m4 18 5-5 4 4 3-3 4 5" />
        </>
      }
    />
  ),
  trash: (
    <Ico
      size={14}
      d={
        <>
          <path d="M4 7h16" />
          <path d="M9 7V5h6v2" />
          <path d="M6 7v12a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7" />
          <path d="M10 11v6M14 11v6" />
        </>
      }
    />
  ),
};
