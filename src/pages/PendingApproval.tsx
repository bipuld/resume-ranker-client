import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, LogOut, RefreshCw, UserCircle2, Zap } from "lucide-react";
import { getCompanyStatus } from "../api/company";
import { ROUTES } from "../routes/paths";
import {
  clearAuthSession,
  resolveRecruiterCompanyStage,
  saveRecruiterCompanyStage,
} from "../utils/authSession";
import ThemeToggle from "../components/ThemeToggle";

const getErrorMessage = (err: unknown, fallback: string) => {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as { response?: { data?: { message?: string; detail?: string } } }).response?.data
      ?.message === "string"
  ) {
    return (err as { response?: { data?: { message?: string } } }).response!.data!.message!;
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ===
      "string"
  ) {
    return (err as { response?: { data?: { detail?: string } } }).response!.data!.detail!;
  }

  return fallback;
};

export default function PendingApproval() {
  const navigate = useNavigate();
  const [company, setCompany] = useState<{ id?: string | number; name?: string } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [checkCount, setCheckCount] = useState(0);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setNotice("");
    setError("");

    try {
      const res = await getCompanyStatus();
      const stage = resolveRecruiterCompanyStage(res);
      saveRecruiterCompanyStage(stage);
      setCompany((res as any)?.company || null);
      setCheckCount((prev) => prev + 1);
      setLastChecked(new Date());

      if (stage === "approved") {
        setNotice("Your company has been approved. Redirecting...");
        setTimeout(() => {
          navigate(ROUTES.dashboard.recruiter, { replace: true });
        }, 1500);
        return;
      }

      if (stage === "no-company") {
        navigate(ROUTES.recruiter.createCompany, { replace: true });
        return;
      }

      setNotice("Your company is still under review. We're checking your details...");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not check status right now."));
    } finally {
      setIsChecking(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = window.setInterval(() => {
      handleCheckStatus();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [autoRefreshEnabled]);

  // Initial check on mount
  useEffect(() => {
    handleCheckStatus();
  }, []);

  const handleSignOut = () => {
    clearAuthSession();
    navigate(ROUTES.auth.login, { replace: true });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-cyan-50 to-blue-100 px-4 py-8 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
      <ThemeToggle compact />

      <section className="mx-auto max-w-3xl rounded-3xl border border-white/40 bg-white/60 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/45 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-blue-300/70 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
            onClick={() => navigate(ROUTES.recruiter.profile)}
          >
            <UserCircle2 size={16} />
            Profile
          </button>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">Step 2 of 2</p>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white/70 p-5 dark:border-slate-700 dark:bg-slate-900/60">
          <div className="mb-3 inline-flex rounded-xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300">
            <Clock size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Verification in progress</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Your company profile has been submitted for admin review. We typically complete this within 24-48 hours.
          </p>
        </div>

        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-300/60 bg-emerald-50 p-3 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">Company Created</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-cyan-300/60 bg-cyan-50 p-3 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300">
            <Clock size={18} />
            <span className="text-sm font-medium">Admin Review In Progress</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-300/80 bg-slate-50 p-3 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
            <Zap size={18} />
            <span className="text-sm font-medium">Account Activation Pending</span>
          </div>
        </div>

        {notice && (
          <div className={`mb-4 flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${notice.includes("approved") ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-300"}`}>
            <CheckCircle2 size={16} className="mt-0.5" />
            <p>{notice}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="mb-4 rounded-xl border border-slate-200 bg-white/70 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/60">
          <p className="text-slate-700 dark:text-slate-300">Checks performed: <strong>{checkCount}</strong></p>
          {lastChecked && <p className="mt-1 text-slate-700 dark:text-slate-300">Last checked: <strong>{lastChecked.toLocaleTimeString()}</strong></p>}
        </div>

        <label htmlFor="auto-refresh" className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <input
            id="auto-refresh"
            type="checkbox"
            checked={autoRefreshEnabled}
            onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          />
          Auto-check every 30 seconds
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => navigate(ROUTES.recruiter.editCompany)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <Clock size={16} />
            Edit company
          </button>
          <button
            type="button"
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-blue-700 disabled:opacity-60"
          >
            <RefreshCw size={16} className={isChecking ? "animate-spin" : ""} />
            {isChecking ? "Checking..." : "Check now"}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>

        {company?.name && (
          <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">
            Editing <strong>{company.name}</strong> keeps your profile in review until it is approved.
          </p>
        )}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-700 dark:text-slate-200">Need help?</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            If you have not received an update after 48 hours, contact support at <strong>support@apexats.com</strong>.
          </p>
        </div>
      </section>
    </main>
  );
}
