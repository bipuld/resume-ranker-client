import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  changePassword,
  loginUser,
  requestPasswordReset,
  resendOtp,
  signupUser,
  verifyLoginOtp,
} from "../api/auth";
import ThemeToggle from "../components/ThemeToggle";
import { ROUTES } from "../routes/paths";
import { getOrCreateDeviceToken, saveAuthRole, saveAuthSession } from "../utils/authSession";
import atsIcon from "../assets/ats-icon.svg";
import "./Login.css";

type AuthMode = "login" | "signup" | "otp" | "reset" | "change";
type LoginRole = "candidate" | "recruiter" | "admin";

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

const PASSWORD_POLICY = {
  minLength: 8,
};

const isStrongPassword = (value: string) => {
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);
  const hasLength = value.length >= PASSWORD_POLICY.minLength;

  return hasUpper && hasLower && hasNumber && hasSpecial && hasLength;
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
  change: {
    title: "Change password",
    help: "Use your current password and set a new secure password.",
    actionLabel: "Update password",
  },
};

export default function Login({
  defaultLoginRole = "candidate",
  lockLoginRole = false,
}: LoginProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginRole, setLoginRole] = useState<LoginRole>(defaultLoginRole);

  useEffect(() => {
    if (lockLoginRole) {
      setLoginRole(defaultLoginRole);
    }
  }, [defaultLoginRole, lockLoginRole]);

  const deviceToken = useMemo(() => getOrCreateDeviceToken(), []);
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
  const [changeForm, setChangeForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showChangePasswords, setShowChangePasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      const res = await signupUser({
        email: signupForm.email.trim().toLowerCase(),
        password: signupForm.password,
        first_name: signupForm.first_name.trim(),
        middle_name: signupForm.middle_name.trim(),
        last_name: signupForm.last_name.trim(),
        phone: signupForm.phone.trim(),
        full_name: fullName,
        role: 'candidate',  // Hidden value - automatically sent as 'candidate'
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

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (changeForm.new_password !== changeForm.confirm_password) {
      setError("New password and confirm password must match.");
      return;
    }

    if (!isStrongPassword(changeForm.new_password)) {
      setError(
        "Use a stronger password: at least 8 characters with uppercase, lowercase, number, and symbol.",
      );
      return;
    }

    setIsLoading(true);

    try {
      const res = await changePassword({
        old_password: changeForm.old_password,
        new_password: changeForm.new_password,
      });
      setSuccess(res.message || "Password changed successfully.");
      setChangeForm({ old_password: "", new_password: "", confirm_password: "" });
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not change password."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <ThemeToggle />
      <div className="bg-shape shape-left" aria-hidden="true" />
      <div className="bg-shape shape-right" aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />

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
              ? "Recruiter Login"
              : modeContent[mode].title}
        </h1>
        <p className="subtitle">
          {mode === "login" && loginRole === "admin"
            ? "Sign in with your administrator account to access the admin panel."
            : mode === "login" && loginRole === "recruiter"
              ? "Sign in with your recruiter account to manage jobs and applicants."
            : modeContent[mode].help}
        </p>

        <div className="feedback-zone" aria-live="polite">
          {error && <p className="feedback error">{error}</p>}
          {success && <p className="feedback success">{success}</p>}
        </div>

        {mode === "login" && (
          <form className="login-form" onSubmit={handleLogin}>
            {!lockLoginRole && (
              <div className="role-switch" role="tablist" aria-label="Select login access">
                <button
                  type="button"
                  role="tab"
                  aria-selected={loginRole === "candidate"}
                  className={`role-chip ${loginRole === "candidate" ? "active" : ""}`}
                  onClick={() => setLoginRole("candidate")}
                >
                  Candidate Login
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={loginRole === "admin"}
                  className={`role-chip ${loginRole === "admin" ? "active" : ""}`}
                  onClick={() => setLoginRole("admin")}
                >
                  Admin Panel Login
                </button>
              </div>
            )}

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

            <div className="inline-actions">
              {loginRole === "candidate" && (
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
              <button
                type="button"
                className="text-action"
                onClick={() => {
                  setMode("change");
                  setError("");
                  setSuccess("");
                }}
              >
                Change password
              </button>
            </div>
          </form>
        )}

        {mode === "signup" && (
          <form className="login-form" onSubmit={handleSignup}>
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

            <button
              type="button"
              className="text-action align-left"
              onClick={() => {
                setMode("change");
                setError("");
                setSuccess("");
              }}
            >
              Need to change password instead?
            </button>
          </form>
        )}

        {mode === "change" && (
          <form className="login-form" onSubmit={handleChangePassword}>
            <label htmlFor="old_password">Current Password</label>
            <input
              id="old_password"
              type={showChangePasswords ? "text" : "password"}
              placeholder="Current password"
              value={changeForm.old_password}
              onChange={(e) => setChangeForm({ ...changeForm, old_password: e.target.value })}
              autoComplete="current-password"
              required
            />

            <label htmlFor="new_password">New Password</label>
            <input
              id="new_password"
              type={showChangePasswords ? "text" : "password"}
              placeholder="New password"
              value={changeForm.new_password}
              onChange={(e) => setChangeForm({ ...changeForm, new_password: e.target.value })}
              autoComplete="new-password"
              required
            />
            <p className="hint-text">
              Minimum 8 characters with uppercase, lowercase, number, and special symbol.
            </p>

            <label htmlFor="confirm_password">Confirm New Password</label>
            <input
              id="confirm_password"
              type={showChangePasswords ? "text" : "password"}
              placeholder="Confirm new password"
              value={changeForm.confirm_password}
              onChange={(e) =>
                setChangeForm({ ...changeForm, confirm_password: e.target.value })
              }
              autoComplete="new-password"
              required
            />

            <label className="checkbox-row" htmlFor="show-change-passwords">
              <input
                id="show-change-passwords"
                type="checkbox"
                checked={showChangePasswords}
                onChange={(e) => setShowChangePasswords(e.target.checked)}
              />
              Show password fields
            </label>

            <button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : modeContent.change.actionLabel}
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

            <button
              type="button"
              className="text-action align-left"
              onClick={() => {
                setMode("reset");
                setError("");
                setSuccess("");
              }}
            >
              Forgot your current password?
            </button>
          </form>
        )}

        <footer className="auth-footer">
          {/* <span>Protected authentication service</span>
          <span>Build 1.0.0</span> */}
        </footer>
      </section>
    </main>
  );
}