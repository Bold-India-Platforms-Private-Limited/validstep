import { useState } from "react";
import toast from "react-hot-toast";
import { useGetNdaStatusQuery, useSignNdaMutation } from "../api/apiSlice";
import Button from "./ui/Button";

// Blocks the app behind a full-screen NDA modal until the member signs — only if the
// admin has actually configured NDA content for this workspace, otherwise it's a no-op.
export default function NdaGate({ workspaceId, children }) {
  const { data, isLoading } = useGetNdaStatusQuery(workspaceId, { skip: !workspaceId });
  const [signNda, { isLoading: signing }] = useSignNdaMutation();
  const [signatureName, setSignatureName] = useState("");
  const [agreed, setAgreed] = useState(false);

  if (isLoading || !workspaceId) return children;
  if (data?.signed || !data?.ndaContent) return children;

  async function handleSign(e) {
    e.preventDefault();
    try {
      await signNda({ workspaceId, signatureName }).unwrap();
      toast.success("Signed — welcome aboard!");
    } catch (err) {
      toast.error(err?.data?.error || "Failed to sign");
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
      <form
        onSubmit={handleSign}
        className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Non-Disclosure Agreement</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Please read and sign before continuing</p>
        </div>
        <div className="px-6 py-4 overflow-y-auto grow">
          <p className="text-sm text-neutral-700 dark:text-neutral-200 whitespace-pre-wrap">{data.ndaContent}</p>
        </div>
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Type your full name to sign</label>
            <input
              autoFocus
              required
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
              placeholder="Full name"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <input type="checkbox" required checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="rounded" />
            I have read and agree to the terms above
          </label>
          <Button type="submit" loading={signing} disabled={!agreed} className="w-full">
            Sign & Continue
          </Button>
        </div>
      </form>
    </div>
  );
}
