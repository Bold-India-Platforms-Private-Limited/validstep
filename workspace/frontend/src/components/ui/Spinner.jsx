export default function Spinner({ size = 24, className = "" }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`border-2 border-indigo-500 border-t-transparent rounded-full animate-spin ${className}`}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px] w-full">
      <Spinner size={32} />
    </div>
  );
}
