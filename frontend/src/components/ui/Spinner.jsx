export default function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
  return <div className={`${s} border-2 border-primary border-t-transparent rounded-full animate-spin`} />;
}

export function FullPageSpinner() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-surface">
      <Spinner size="lg" />
    </div>
  );
}
