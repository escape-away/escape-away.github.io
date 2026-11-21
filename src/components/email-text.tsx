/**
 * An email address that, in a narrow column, wraps right after the @ rather than in the middle of a
 * word ("…@gmail.co / m"). Pair it with `break-words` so an address longer than the column still fits.
 */
export function EmailText({ email }: { email: string }) {
  const at = email.indexOf('@');
  if (at < 0) return <>{email}</>;
  return (
    <>
      {email.slice(0, at + 1)}
      <wbr />
      {email.slice(at + 1)}
    </>
  );
}
