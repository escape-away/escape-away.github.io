'use client';

import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

/**
 * Form fields for both grounds (cream pages and the navy owner section): the label above, a hint
 * under the field when it helps, and an error under its own field that names the fix. Errors are
 * tied to the field with aria-describedby, so a screen reader reads them when the field takes focus.
 * Required fields say so with aria-required, not the native attribute: the forms check their own
 * answers (noValidate), and a native `required` made Chrome announce an empty field as invalid
 * before the visitor had typed anything.
 */

type Common = {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  /** "(optional)", shown after the label. Required fields carry no mark. */
  optional?: string;
  /** Extra line under the field, such as an email suggestion. */
  after?: ReactNode;
  className?: string;
};

function describedBy(id: string, hint: boolean, error: boolean) {
  return [error ? `${id}-error` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined;
}

function Frame({ id, label, hint, error, optional, after, className = '', children }: Common & { id: string; children: ReactNode }) {
  return (
    <div className={`field ${className}`} data-invalid={error ? '' : undefined}>
      <label htmlFor={id} className="field__label">
        {label}
        {optional ? <span className="field__optional"> {optional}</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="field__error">
          {error}
        </p>
      ) : null}
      {after}
      {hint ? (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  optional,
  after,
  className,
  ref,
  required,
  ...input
}: Common & { ref?: Ref<HTMLInputElement> } & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>) {
  const id = useId();
  return (
    <Frame id={id} label={label} hint={hint} error={error} optional={optional} after={after} className={className}>
      <input
        ref={ref}
        id={id}
        className="field__input"
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, Boolean(hint), Boolean(error))}
        {...input}
      />
    </Frame>
  );
}

export function TextArea({
  label,
  hint,
  error,
  optional,
  after,
  className,
  ref,
  required,
  ...area
}: Common & { ref?: Ref<HTMLTextAreaElement> } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>) {
  const id = useId();
  return (
    <Frame id={id} label={label} hint={hint} error={error} optional={optional} after={after} className={className}>
      <textarea
        ref={ref}
        id={id}
        className="field__input field__textarea"
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, Boolean(hint), Boolean(error))}
        {...area}
      />
    </Frame>
  );
}

export function SelectField({
  label,
  hint,
  error,
  optional,
  after,
  className,
  ref,
  children,
  required,
  ...select
}: Common & { ref?: Ref<HTMLSelectElement>; children: ReactNode } & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'>) {
  const id = useId();
  return (
    <Frame id={id} label={label} hint={hint} error={error} optional={optional} after={after} className={className}>
      <select
        ref={ref}
        id={id}
        className="field__input field__select"
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, Boolean(hint), Boolean(error))}
        {...select}
      >
        {children}
      </select>
    </Frame>
  );
}

/** One choice from a few, as pill-shaped radios. The first radio takes the ref, for focus on an error. */
export function ChoiceField<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  error,
  hint,
  optional,
  ref,
}: {
  legend: ReactNode;
  name: string;
  options: { value: T; label: ReactNode }[];
  value: T | '';
  onChange: (value: T) => void;
  error?: string | null;
  hint?: ReactNode;
  optional?: string;
  ref?: Ref<HTMLInputElement>;
}) {
  const id = useId();
  const described = describedBy(id, Boolean(hint), Boolean(error));
  return (
    <fieldset className="field" data-invalid={error ? '' : undefined}>
      <legend className="field__label">
        {legend}
        {optional ? <span className="field__optional"> {optional}</span> : null}
      </legend>
      <div className="picks">
        {options.map((option, i) => (
          <label key={option.value} className="pick">
            <input
              ref={i === 0 ? ref : undefined}
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              aria-describedby={described}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {error ? (
        <p id={`${id}-error`} className="field__error">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}

/** A field only bots fill in. Off-screen and out of the tab order; screen readers skip it too. */
export function Honeypot({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <div className="hp" aria-hidden="true">
      <label>
        {label}
        <input type="text" name="company" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}
