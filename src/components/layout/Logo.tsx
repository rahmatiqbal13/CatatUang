/** Ledger-lines mark + italic serif wordmark. */
export function Logo() {
  return (
    <>
      <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px]" style={{ background: 'var(--accent-100)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M5 4h14M5 9h14M5 14h9M5 19h6" />
        </svg>
      </span>
      <span className="serif text-[24px] italic tracking-[-0.01em]" style={{ color: 'var(--text)' }}>CatatUang</span>
    </>
  )
}
