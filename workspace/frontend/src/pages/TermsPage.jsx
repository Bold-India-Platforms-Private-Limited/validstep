import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 px-4 py-8">
      <div className="max-w-2xl mx-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 mb-4">
          <ArrowLeft size={15} /> Back
        </Link>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">Terms & Conditions</h1>
        <div className="prose prose-sm dark:prose-invert text-sm text-neutral-600 dark:text-neutral-300 space-y-4">
          <p>
            By using this workspace, you agree to conduct yourself professionally, keep your login
            credentials confidential, and use the platform only for activities related to your
            internship or assignment.
          </p>
          <p>
            Any content, code, documents, or materials you access through this workspace remain the
            property of the organization and must not be shared outside the platform without
            authorization.
          </p>
          <p>
            Your attendance, task activity, and submissions may be reviewed by administrators as part
            of normal program operations.
          </p>
          <p>
            The organization may suspend or remove access at its discretion for violations of these
            terms or the separately signed NDA, where applicable.
          </p>
          <p className="text-neutral-400">Contact your program administrator with any questions about these terms.</p>
        </div>
      </div>
    </div>
  );
}
