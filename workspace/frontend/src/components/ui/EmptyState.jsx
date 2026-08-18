export default function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 text-neutral-500">
      {Icon && <Icon size={40} className="mb-3 opacity-40" />}
      <p className="font-medium text-neutral-700 dark:text-neutral-300">{title}</p>
      {subtitle && <p className="text-sm mt-1 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
