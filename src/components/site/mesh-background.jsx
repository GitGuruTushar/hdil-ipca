// Ambient tinted background for the whole public site: static radial
// washes plus two slowly drifting tint blobs (transform-only, cheap).

export default function MeshBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        backgroundImage:
          "radial-gradient(52rem 36rem at 0% 0%, rgba(79,70,226,0.12), transparent 62%)," +
          "radial-gradient(46rem 32rem at 100% 12%, rgba(236,72,153,0.08), transparent 60%)," +
          "radial-gradient(56rem 40rem at 55% 105%, rgba(16,185,129,0.08), transparent 60%)",
      }}
    >
      <div
        className="drift-a absolute -left-40 top-24 h-[30rem] w-[30rem] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(124,58,237,0.10), transparent)",
        }}
      />
      <div
        className="drift-b absolute -right-40 top-[55%] h-[26rem] w-[26rem] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(79,70,226,0.10), transparent)",
        }}
      />
    </div>
  );
}
