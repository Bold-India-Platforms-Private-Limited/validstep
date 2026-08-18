import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useLoginMutation, useForgotPasswordMutation } from "../api/apiSlice";
import { setCredentials } from "../features/auth/authSlice";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [forgotOpen, setForgotOpen] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const { token, user } = await login({ email, password }).unwrap();
      dispatch(setCredentials({ token, user }));
      navigate(user.isSuperAdmin ? "/admin" : "/app", { replace: true });
    } catch (err) {
      toast.error(err?.data?.error || "Login failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8"
      >
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">Welcome back</h1>
        <p className="text-sm text-neutral-500 mb-6">Sign in to your workspace</p>

        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mt-1 mb-4 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
          placeholder="you@company.com"
        />

        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Password</label>
          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            className="text-xs text-indigo-600 hover:underline"
          >
            Forgot password?
          </button>
        </div>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mt-1 mb-6 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
          placeholder="••••••••"
        />

        <Button type="submit" loading={isLoading} className="w-full">
          Sign in
        </Button>
      </form>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} initialEmail={email} />
    </div>
  );
}

function ForgotPasswordModal({ open, onClose, initialEmail }) {
  const [email, setEmail] = useState(initialEmail || "");
  const [sent, setSent] = useState(false);
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await forgotPassword(email).unwrap();
      setSent(true);
    } catch {
      toast.error("Something went wrong. Try again.");
    }
  }

  function handleClose() {
    setSent(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Reset your password">
      {sent ? (
        <div className="text-center py-2">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            If <strong>{email}</strong> is registered, we've emailed a new password to it. Check your inbox.
          </p>
          <Button className="w-full mt-5" onClick={handleClose}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Email</label>
            <input
              autoFocus
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
              placeholder="you@company.com"
            />
          </div>
          <Button type="submit" loading={isLoading} className="w-full">
            Send new password
          </Button>
        </form>
      )}
    </Modal>
  );
}
