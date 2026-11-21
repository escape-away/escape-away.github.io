import type { ReactNode } from 'react';

/** A section title in the brand's two weights, with the short gold rule under it. */
export function SectionTitle({
  light,
  bold,
  as: Tag = 'h2',
  className = '',
  id,
}: {
  light: ReactNode;
  bold?: ReactNode;
  as?: 'h1' | 'h2';
  className?: string;
  id?: string;
}) {
  return (
    <Tag id={id} className={`t-title title-rule ${className}`}>
      {light}
      {bold ? <> <strong>{bold}</strong></> : null}
    </Tag>
  );
}
