import type { ReactNode } from 'react';

/** The explorer's icons: one 20px grid, a 1.75 stroke, round ends. Drawn here, decorative to screen readers. */
type IconProps = { className?: string };

function Icon({ className = '', children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 4.5v11M4.5 10h11" />
  </Icon>
);

export const MinusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 10h11" />
  </Icon>
);

/** Four corners: fit every stay into view. */
export const FitIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 7.5v-4h4M12.5 3.5h4v4M16.5 12.5v4h-4M7.5 16.5h-4v-4" />
  </Icon>
);

/** A heart: saved stays. Its fill is set in CSS, so the pressed state can fill it. */
export const HeartIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 17s-6.5-3.9-7.8-8C1.4 6.4 3 3.6 5.9 3.6c1.8 0 3.2 1 4.1 2.4.9-1.4 2.3-2.4 4.1-2.4 2.9 0 4.5 2.8 3.7 5.4C16.5 13.1 10 17 10 17z" />
  </Icon>
);

/** A magnifier: the search. */
export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="9" r="5.5" />
    <path d="M13.2 13.2L17 17" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 5l10 10M15 5L5 15" />
  </Icon>
);

/** Two sliders: the filters. */
export const FiltersIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 6h7M14 6h3M3 14h3M10 14h7" />
    <circle cx="12" cy="6" r="2" />
    <circle cx="8" cy="14" r="2" />
  </Icon>
);

/** A folded map. */
export const MapIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7.5 3.5L3 5.25v11.25l4.5-1.75 5 1.75 4.5-1.75V3.5L12.5 5.25z" />
    <path d="M7.5 3.5v11.25M12.5 5.25V16.5" />
  </Icon>
);

/** Three lines: the list. */
export const ListIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 5.5h10M7 10h10M7 14.5h10" />
    <circle cx="3.75" cy="5.5" r="0.6" fill="currentColor" />
    <circle cx="3.75" cy="10" r="0.6" fill="currentColor" />
    <circle cx="3.75" cy="14.5" r="0.6" fill="currentColor" />
  </Icon>
);

/** A chevron pointing forward in reading order; add `icon--back` for the other way. Mirrors in Arabic. */
export const ChevronIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7.5 4.5L13 10l-5.5 5.5" />
  </Icon>
);
