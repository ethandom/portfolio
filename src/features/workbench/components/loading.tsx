/** Shown while the 3D code, then the model, downloads. */
export function Loading() {
  return (
    <p
      role="status"
      className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-label text-ink-muted uppercase"
    >
      Loading workbench
    </p>
  );
}
