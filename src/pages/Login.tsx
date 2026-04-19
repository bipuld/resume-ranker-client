import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  loginUser,
  requestPasswordReset,
  resendOtp,
  signupUser,
  verifyLoginOtp,
} from "../api/auth";
import { getCompanyStatus } from "../api/company";
import ThemeToggle from "../components/ThemeToggle";
import { ROUTES } from "../routes/paths";
import {
  getOrCreateDeviceToken,
  resolveRecruiterCompanyStage,
  saveAuthRole,
  saveAuthSession,
  saveRecruiterCompanyStage,
} from "../utils/authSession";
import atsIcon from "../assets/ats-icon.svg";
import "./Login.css";

type AuthMode = "login" | "signup" | "otp" | "reset";
type LoginRole = "candidate" | "recruiter" | "admin";
type SignupRole = "candidate" | "recruiter";

type LoginProps = {
  defaultLoginRole?: LoginRole;
  lockLoginRole?: boolean;
};

const OTP_DURATION_SECONDS = 60;

const getErrorMessage = (err: unknown, fallback: string) => {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as { response?: { data?: { message?: string; detail?: string } } }).response
      ?.data?.message === "string"
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

const isUnverifiedEmailError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("please verify your email") ||
    normalized.includes("verify your email first") ||
    normalized.includes("email not verified") ||
    normalized.includes("email is not verified")
  );
};

const getDeviceType = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|mobile/i.test(userAgent) ? "mobile" : "web";
};

const getDeviceName = () => {
  const platform = navigator.platform || "unknown-platform";
  const language = navigator.language || "unknown-language";
  return `${platform}-${language}`;
};


const modeContent: Record<AuthMode, { title: string; help: string; actionLabel: string }> = {
  login: {
    title: "Sign in",
    help: "Enter your account credentials to continue.",
    actionLabel: "Continue",
  },
  signup: {
    title: "Create account",
    help: "Create your ATS account to start managing hiring workflows.",
    actionLabel: "Create account",
  },
  otp: {
    title: "Verify OTP",
    help: "Enter the one-time code sent to your email to complete sign in.",
    actionLabel: "Verify OTP",
  },
  reset: {
    title: "Reset password",
    help: "Enter your email and we will send a password reset link.",
    actionLabel: "Send reset email",
  },
};

const showcaseByRole = {
  candidate: {
    eyebrow: "Candidate Workspace",
    title: "Build your career with clarity",
    description:
      "Apply quickly, track every stage, and keep your job journey organized from one dashboard.",
    stats: ["1-click applications", "Live status tracking", "Unified candidate profile"],
  },
  recruiter: {
    eyebrow: "Recruiter Workspace",
    title: "Hire better with a real system",
    description:
      "Launch openings, screen applicants, and manage hiring operations with reliable recruiter tools.",
    stats: ["Smart applicant pipelines", "Team collaboration tools", "Company approval workflow"],
  },
  admin: {
    eyebrow: "Admin Workspace",
    title: "Control and monitor the platform",
    description:
      "Oversee recruiter onboarding, governance, and system health from a secure operational console.",
    stats: ["Access management", "Approval and compliance controls", "Operational visibility"],
  },
} as const;

export default function Login({
  defaultLoginRole = "candidate",
  lockLoginRole = false,
}: LoginProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginRole, setLoginRole] = useState<LoginRole>(defaultLoginRole);
  const [signupRole, setSignupRole] = useState<SignupRole>(
    defaultLoginRole === "recruiter" ? "recruiter" : "candidate",
  );

  useEffect(() => {
    if (lockLoginRole) {
      setLoginRole(defaultLoginRole);
    }
  }, [defaultLoginRole, lockLoginRole]);

  useEffect(() => {
    if (loginRole === "candidate" || loginRole === "recruiter") {
      setSignupRole(loginRole);
    }
  }, [loginRole]);

  const deviceToken = useMemo(() => getOrCreateDeviceToken(), []);
  const currentShowcase = useMemo(() => showcaseByRole[loginRole], [loginRole]);
  const deviceType = useMemo(() => getDeviceType(), []);
  const deviceName = useMemo(() => getDeviceName(), []);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [signupForm, setSignupForm] = useState({
    email: "",
    password: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    phone: "",
  });
  const [otpForm, setOtpForm] = useState({
    email: "",
  });
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [otpTimeLeft, setOtpTimeLeft] = useState(OTP_DURATION_SECONDS);
  const [resetEmail, setResetEmail] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reason = params.get("reason");
    const sessionNotice = window.sessionStorage.getItem("ats.auth.notice");
    let noticeMessage = sessionNotice;

    if (sessionNotice) {
      try {
        const parsed = JSON.parse(sessionNotice) as {
          message?: string;
          expiresAt?: number;
        };

        if (parsed?.message) {
          if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
            window.sessionStorage.removeItem("ats.auth.notice");
            noticeMessage = "";
          } else {
            noticeMessage = parsed.message;
          }
        }
      } catch {
        noticeMessage = sessionNotice;
      }
    }

    if (reason === "session-expired" || noticeMessage) {
      setError(noticeMessage || "Your session expired. Please sign in again.");
      setSuccess("");
    }
  }, [location.search]);

  useEffect(() => {
    if (mode !== "otp" || otpTimeLeft <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setOtpTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [mode, otpTimeLeft]);

  const otpTimerLabel = `${String(Math.floor(otpTimeLeft / 60)).padStart(2, "0")}:${String(
    otpTimeLeft % 60,
  ).padStart(2, "0")}`;

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const res = await loginUser({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        fcm_token: deviceToken,
        device_type: deviceType,
        device_name: deviceName,
        device_id: deviceToken,
        role: lockLoginRole ? defaultLoginRole : loginRole,
      });

      const resolvedRole = lockLoginRole ? defaultLoginRole : loginRole;
      saveAuthSession(res);
      saveAuthRole(resolvedRole);

      if (resolvedRole === "admin") {
        navigate(ROUTES.dashboard.admin);
        return;
      }

      if (resolvedRole === "recruiter") {
        let stage = resolveRecruiterCompanyStage(res);

        try {
          const companyStatus = await getCompanyStatus();
          stage = resolveRecruiterCompanyStage(companyStatus);
        } catch {
          // Fall back to login response if the company lookup is unavailable.
        }

        saveRecruiterCompanyStage(stage);

        if (stage === "no-company") {
          navigate(ROUTES.recruiter.createCompany);
          return;
        }

        if (stage === "pending-approval") {
          navigate(ROUTES.recruiter.pendingApproval);
          return;
        }

        navigate(ROUTES.dashboard.recruiter);
        return;
      }

      setSuccess(res.message || "Login successful.");
    } catch (err: unknown) {
      const loginError = getErrorMessage(err, "Login failed. Please check your email and password.");

      if (isUnverifiedEmailError(loginError)) {
        const loginEmail = form.email.trim().toLowerCase();
        setOtpForm({ email: loginEmail });
        setOtpDigits(["", "", "", "", "", ""]);
        setOtpTimeLeft(OTP_DURATION_SECONDS);
        setMode("otp");
        setSuccess("Please verify your email first. Enter the OTP sent to your email.");
        setError("");
      } else {
        setError(loginError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const fullName = [
      signupForm.first_name.trim(),
      signupForm.middle_name.trim(),
      signupForm.last_name.trim(),
    ]
      .filter(Boolean)
      .join(" ");

    if (!fullName) {
      setError("Please enter at least first name or last name.");
      return;
    }

    setIsLoading(true);

    try {
      const resolvedSignupRole =
        lockLoginRole && defaultLoginRole === "recruiter" ? "recruiter" : "candidate";

      const res = await signupUser({
        email: signupForm.email.trim().toLowerCase(),
        password: signupForm.password,
        first_name: signupForm.first_name.trim(),
        middle_name: signupForm.middle_name.trim(),
        last_name: signupForm.last_name.trim(),
        phone: signupForm.phone.trim(),
        full_name: fullName,
        role: resolvedSignupRole,
      });

      const signupEmail = signupForm.email.trim().toLowerCase();
      setOtpForm({ email: signupEmail });
      setOtpDigits(["", "", "", "", "", ""]);
      setOtpTimeLeft(OTP_DURATION_SECONDS);
      setMode("otp");
      setSuccess(res.message || "Signup successful. Please verify the 6-digit OTP sent to email.");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Signup failed. Please check the details and try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const otpCode = otpDigits.join("");

    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    if (otpTimeLeft <= 0) {
      setError("OTP has expired. Please resend OTP and try again.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await verifyLoginOtp({
        email: otpForm.email.trim().toLowerCase(),
        otp: otpCode,
      });

      setSuccess(res.message || "OTP verified successfully. You can now sign in.");
      setMode("login");
      setForm({ email: otpForm.email.trim().toLowerCase(), password: "" });
      setOtpDigits(["", "", "", "", "", ""]);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "OTP verification failed. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setSuccess("");

    if (!otpForm.email.trim()) {
      setError("Email is required to resend OTP.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await resendOtp({ email: otpForm.email.trim().toLowerCase() });
      setOtpDigits(["", "", "", "", "", ""]);
      setOtpTimeLeft(OTP_DURATION_SECONDS);
      setSuccess(res.message || "OTP resent successfully.");
      otpRefs.current[0]?.focus();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not resend OTP. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);

    if (digit && index < otpRefs.current.length - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) {
      return;
    }

    const next = ["", "", "", "", "", ""];
    text.split("").forEach((char, index) => {
      next[index] = char;
    });
    setOtpDigits(next);

    const focusIndex = Math.min(text.length, 5);
    otpRefs.current[focusIndex]?.focus();
  };

  const handleReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const res = await requestPasswordReset({ email: resetEmail.trim().toLowerCase() });
      setSuccess(res.message || "Reset link email sent.");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not send reset link. Try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: "google" | "facebook") => {
    setError("");
    setSuccess(`${provider === "google" ? "Google" : "Facebook"} login will be available soon.`);
  };

  return (
    <main className="login-shell min-h-screen bg-gradient-to-br from-slate-100 via-cyan-50 to-indigo-100 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <ThemeToggle compact />
      <div className="bg-shape shape-left" aria-hidden="true" />
      <div className="bg-shape shape-right" aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />

      <div className="login-layout">
        <aside className="login-showcase" aria-label="Platform overview">
          <p className="showcase-eyebrow">{currentShowcase.eyebrow}</p>
          <h2>{currentShowcase.title}</h2>
          <p>{currentShowcase.description}</p>

          <div className="showcase-metrics">
            <article>
              <strong>{currentShowcase.stats[0]}</strong>
              <span>Designed for daily production workflows</span>
            </article>
            <article>
              <strong>{currentShowcase.stats[1]}</strong>
              <span>Built to reduce friction and delays</span>
            </article>
            <article>
              <strong>{currentShowcase.stats[2]}</strong>
              <span>Reliable experience across every role</span>
            </article>
          </div>

          {loginRole !== "admin" && (
            <div className="showcase-cta" role="group" aria-label="Primary account actions">
              <div className="showcase-cta-actions">
                <button
                  type="button"
                  className="showcase-primary"
                  onClick={() =>
                    navigate(loginRole === "recruiter" ? ROUTES.auth.login : ROUTES.auth.recruiterLogin)
                  }
                >
                  {loginRole === "recruiter" ? "Apply for job" : "Start hiring with us"}
                </button>
              </div>
            </div>
          )}

          <div className="system-orbit" aria-hidden="true">
            <div className="orbit-core" />
            <div className="orbit-card profit">
              <p>Applicants</p>
              <strong>624+</strong>
              <span>+18.4% this week</span>
            </div>
            <div className="orbit-card conversion">
              <p>Interviews</p>
              <strong>124</strong>
              <span>+12.0% conversion</span>
            </div>
          </div>
        </aside>

        <section className="login-card" aria-labelledby="login-title">
        <header className="brand-header">
          <div className="brand-main">
            <img src={atsIcon} className="brand-icon" alt="ATS icon" />
            <div>
              <p className="eyebrow">Apex ATS</p>
              <p className="brand-sub">Recruiting Workspace</p>
            </div>
          </div>
          {/* <span className="status-pill">Secure</span> */}
        </header>

        <h1 id="login-title">
          {mode === "login" && loginRole === "admin"
            ? "Admin Panel Login"
            : mode === "login" && loginRole === "recruiter"
              ? "Smart Hire With Us"
              : mode === "login"
                ? "Candidate Login"
              : modeContent[mode].title}
        </h1>
        <p className="subtitle">
          {mode === "login" && loginRole === "admin"
            ? "Sign in with your administrator account to access the admin panel."
            : mode === "login" && loginRole === "recruiter"
              ? "Apply for jobs in a focused workflow built for clarity and fast updates."
              : mode === "login"
                ? '"Smart start hiring with us" and discover better career opportunities in one place.'
            : modeContent[mode].help}
        </p>

        <div className="feedback-zone" aria-live="polite">
          {error && <p className="feedback error">{error}</p>}
          {success && <p className="feedback success">{success}</p>}
        </div>

        {mode === "login" && (
          <form className="login-form" onSubmit={handleLogin}>
            {loginRole === "admin" && (
              <p className="hint-text">Admin access is restricted to authorized admin accounts only.</p>
            )}

            {loginRole === "recruiter" && (
              <p className="hint-text">Recruiter access is restricted to recruiter accounts only.</p>
            )}

            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
              inputMode="email"
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type={showLoginPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password"
              required
            />

            <label className="checkbox-row" htmlFor="show-login-password">
              <input
                id="show-login-password"
                type="checkbox"
                checked={showLoginPassword}
                onChange={(e) => setShowLoginPassword(e.target.checked)}
              />
              Show password
            </label>

            <input type="hidden" value={deviceToken} readOnly aria-hidden="true" />
            <input type="hidden" value={loginRole} readOnly aria-hidden="true" />

            <button type="submit" disabled={isLoading}>
              {isLoading ? "Signing in..." : modeContent.login.actionLabel}
            </button>

            {loginRole !== "admin" && (
              <div className="social-login-wrap" aria-label="Social login options">
                <button
                  type="button"
                  className="social-login-btn google"
                  onClick={() => handleSocialLogin("google")}
                  aria-label="Continue with Google"
                  title="Continue with Google"
                >
                  <span className="social-brand google" aria-hidden="true">
                    G
                  </span>
                </button>
                <button
                  type="button"
                  className="social-login-btn facebook"
                  onClick={() => handleSocialLogin("facebook")}
                  aria-label="Continue with Facebook"
                  title="Continue with Facebook"
                >
                  <span className="social-brand facebook" aria-hidden="true">
                    f
                  </span>
                </button>
              </div>
            )}

            <div className="inline-actions">
              {(loginRole === "candidate" || loginRole === "recruiter") && (
                <button
                  type="button"
                  className="text-action"
                  onClick={() => {
                    setMode("signup");
                    setError("");
                    setSuccess("");
                  }}
                >
                  Create account
                </button>
              )}
              <button
                type="button"
                className="text-action"
                onClick={() => {
                  setMode("reset");
                  setError("");
                  setSuccess("");
                }}
              >
                Forgot password?
              </button>
            </div>
          </form>
        )}

        {mode === "signup" && (
          <form className="login-form" onSubmit={handleSignup}>
            {!lockLoginRole && (
              <div className="role-switch" role="tablist" aria-label="Select account type">
                <button
                  type="button"
                  role="tab"
                  aria-selected={signupRole === "candidate"}
                  className={`role-chip ${signupRole === "candidate" ? "active" : ""}`}
                  onClick={() => setSignupRole("candidate")}
                >
                  Candidate
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={signupRole === "recruiter"}
                  className={`role-chip ${signupRole === "recruiter" ? "active" : ""}`}
                  onClick={() => setSignupRole("recruiter")}
                >
                  Recruiter
                </button>
              </div>
            )}

            <div className="field-grid two-col">
              <div>
                <label htmlFor="first_name">First Name</label>
                <input
                  id="first_name"
                  type="text"
                  placeholder="First name"
                  value={signupForm.first_name}
                  onChange={(e) => setSignupForm({ ...signupForm, first_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="middle_name">Middle Name</label>
                <input
                  id="middle_name"
                  type="text"
                  placeholder="Middle name"
                  value={signupForm.middle_name}
                  onChange={(e) => setSignupForm({ ...signupForm, middle_name: e.target.value })}
                />
              </div>
            </div>

            <label htmlFor="last_name">Last Name</label>
            <input
              id="last_name"
              type="text"
              placeholder="Last name"
              value={signupForm.last_name}
              onChange={(e) => setSignupForm({ ...signupForm, last_name: e.target.value })}
              required
            />

            <label htmlFor="signup_email">Email</label>
            <input
              id="signup_email"
              type="email"
              placeholder="you@company.com"
              value={signupForm.email}
              onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
              autoComplete="email"
              required
            />

            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              type="tel"
              placeholder="98XXXXXXXX"
              value={signupForm.phone}
              onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
              required
            />

            <label htmlFor="signup_password">Password</label>
            <input
              id="signup_password"
              type="password"
              placeholder="Create password"
              value={signupForm.password}
              onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
              autoComplete="new-password"
              required
            />

            <button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : modeContent.signup.actionLabel}
            </button>

            <button
              type="button"
              className="text-action align-left"
              onClick={() => {
                setMode("login");
                setError("");
                setSuccess("");
              }}
            >
              Back to sign in
            </button>
          </form>
        )}

        {mode === "otp" && (
          <form className="login-form" onSubmit={handleVerifyOtp}>
            <label htmlFor="otp_email">Email</label>
            <input
              id="otp_email"
              type="email"
              value={otpForm.email}
              onChange={(e) => setOtpForm({ ...otpForm, email: e.target.value })}
              autoComplete="email"
              required
            />

            <label>OTP Code</label>
            <div className="otp-grid" role="group" aria-label="6 digit OTP">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    otpRefs.current[index] = element;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  className="otp-input"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={handleOtpPaste}
                  aria-label={`OTP digit ${index + 1}`}
                  required
                />
              ))}
            </div>
            <p className="hint-text">Enter the 6-digit code sent to your email.</p>

            <div className="otp-meta-row">
              {otpTimeLeft > 0 ? (
                <span className="otp-countdown">OTP expires in {otpTimerLabel}</span>
              ) : (
                <span className="otp-expired">OTP expired</span>
              )}
            </div>

            <div className="otp-resend-wrap">
              <span className="otp-resend-note">Didn&apos;t receive the OTP?</span>
              <button
                type="button"
                className="otp-resend-btn"
                disabled={isLoading}
                onClick={handleResendOtp}
              >
                Resend OTP
              </button>
            </div>

            <button type="submit" disabled={isLoading}>
              {isLoading ? "Verifying..." : modeContent.otp.actionLabel}
            </button>

            <button
              type="button"
              className="text-action align-left"
              onClick={() => {
                setMode("login");
                setError("");
                setSuccess("");
                setOtpForm({ email: "" });
                setOtpDigits(["", "", "", "", "", ""]);
              }}
            >
              Back to sign in
            </button>
          </form>
        )}

        {mode === "reset" && (
          <form className="login-form" onSubmit={handleReset}>
            <label htmlFor="reset-email">Email</label>
            <input
              id="reset-email"
              type="email"
              placeholder="you@company.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <button type="submit" disabled={isLoading}>
              {isLoading ? "Sending..." : modeContent.reset.actionLabel}
            </button>

            <button
              type="button"
              className="text-action align-left"
              onClick={() => {
                setMode("login");
                setError("");
                setSuccess("");
              }}
            >
              Back to sign in
            </button>
          </form>
        )}

        <footer className="auth-footer">
          {/* <span>Protected authentication service</span>
          <span>Build 1.0.0</span> */}
        </footer>
        </section>
      </div>
    </main>
  );
}