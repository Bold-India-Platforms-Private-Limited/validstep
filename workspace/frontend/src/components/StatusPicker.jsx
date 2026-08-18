import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useSetMyStatusMutation } from "../api/apiSlice";
import { STATUS_META } from "../utils/presenceStatus";

export default function StatusPicker({ workspaceId, size = "sm" }) {
  const [status, setStatus] = useState("AVAILABLE");
  const [setMyStatus] = useSetMyStatusMutation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleSelect(next) {
    setStatus(next);
    setOpen(false);
    if (workspaceId) await setMyStatus({ workspaceId, status: next });
  }

  const big = size === "lg";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={
          big
            ? "flex items-center gap-2.5 w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
            : "flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        }
      >
        <span className={`rounded-full ${STATUS_META[status].dot} ${big ? "w-3 h-3" : "w-2 h-2"}`} />
        <span className={big ? "text-sm font-medium text-neutral-800 dark:text-neutral-100 flex-1 text-left" : ""}>
          {STATUS_META[status].label}
        </span>
        <ChevronDown size={big ? 16 : 11} className={big ? "text-neutral-400" : ""} />
      </button>

      {open && (
        <div
          className={`absolute z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg py-1.5 ${
            big ? "left-0 right-0 top-full mt-1.5" : "left-0 bottom-full mb-1.5 w-40"
          }`}
        >
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className={`w-full flex items-center gap-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left ${
                big ? "px-4 py-2.5" : "px-3 py-1.5"
              }`}
            >
              <span className={`rounded-full ${meta.dot} ${big ? "w-3 h-3" : "w-2 h-2"}`} />
              <span className={`text-neutral-700 dark:text-neutral-200 ${big ? "text-sm font-medium" : "text-xs"}`}>{meta.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
