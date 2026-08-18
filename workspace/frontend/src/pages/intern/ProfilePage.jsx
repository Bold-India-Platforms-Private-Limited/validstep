import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { LogOut, Mail, Phone } from "lucide-react";
import toast from "react-hot-toast";
import { selectCurrentUser, logout, updateUser } from "../../features/auth/authSlice";
import { useUpdateMeMutation } from "../../api/apiSlice";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";

export default function ProfilePage() {
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [updateMe, { isLoading }] = useUpdateMeMutation();
  const [name, setName] = useState(user?.name || "");
  const [mobile, setMobile] = useState(user?.mobile || "");

  async function handleSave() {
    try {
      const { user: updated } = await updateMe({ name, mobile }).unwrap();
      dispatch(updateUser(updated));
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err?.data?.error || "Failed to update profile");
    }
  }

  return (
    <div className="px-4 sm:px-6 py-5 max-w-md mx-auto">
      <div className="flex flex-col items-center mb-6">
        <Avatar name={user?.name} size={72} />
        <p className="mt-3 font-bold text-lg text-neutral-900 dark:text-white">{user?.name}</p>
        <p className="text-sm text-neutral-500 flex items-center gap-1">
          <Mail size={13} /> {user?.email}
        </p>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
            <Phone size={13} /> Mobile
          </label>
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
            placeholder="Add mobile number"
          />
        </div>
        <Button onClick={handleSave} loading={isLoading} className="w-full">
          Save Changes
        </Button>
      </div>

      <Button
        variant="secondary"
        className="w-full mt-4"
        onClick={() => {
          dispatch(logout());
          navigate("/login");
        }}
      >
        <LogOut size={16} /> Log out
      </Button>
    </div>
  );
}
