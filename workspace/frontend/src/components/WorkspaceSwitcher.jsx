import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, Building2, Check } from "lucide-react";
import { useGetMyWorkspacesQuery } from "../api/apiSlice";

export default function WorkspaceSwitcher() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { data } = useGetMyWorkspacesQuery();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = data?.data?.find((w) => w.id === workspaceId);

  // Group workspaces by company so switching between isolated batches/companies is unambiguous.
  const byCompany = (data?.data || []).reduce((acc, w) => {
    const key = w.company?.name || "Other";
    acc[key] = acc[key] || [];
    acc[key].push(w);
    return acc;
  }, {});

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm max-w-[220px]"
      >
        <Building2 size={15} className="text-indigo-600 shrink-0" />
        <span className="truncate text-neutral-700 dark:text-neutral-200">{current ? current.name : "Switch batch"}</span>
        <ChevronDown size={14} className="text-neutral-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 max-h-96 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg z-50 py-1.5 animate-fade-in">
          {Object.entries(byCompany).map(([companyName, workspaces]) => (
            <div key={companyName} className="mb-1">
              <p className="px-3 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{companyName}</p>
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    navigate(`/admin/w/${w.id}`);
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left"
                >
                  <span className="truncate text-neutral-700 dark:text-neutral-200">{w.name}</span>
                  {w.id === workspaceId && <Check size={14} className="text-indigo-600 shrink-0" />}
                </button>
              ))}
            </div>
          ))}
          {(data?.data || []).length === 0 && <p className="px-3 py-2 text-sm text-neutral-400">No batches yet</p>}
          <div className="border-t border-neutral-100 dark:border-neutral-800 mt-1 pt-1">
            <button
              onClick={() => {
                navigate("/admin");
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Manage companies →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
