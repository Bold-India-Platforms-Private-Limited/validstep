const COLORS = [
  "bg-rose-500", "bg-orange-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500",
  "bg-teal-500", "bg-cyan-500", "bg-blue-500", "bg-indigo-500", "bg-violet-500",
  "bg-fuchsia-500", "bg-pink-500",
];

function colorForName(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function Avatar({ name = "?", src, size = 36, className = "" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={`rounded-full shrink-0 flex items-center justify-center text-white font-semibold ${colorForName(name)} ${className}`}
    >
      {initials || "?"}
    </div>
  );
}
