import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ImagePlus, KeyRound, Save } from "lucide-react";
import { patchProfile, getProfile } from "../api/profile";
import { changePassword } from "../api/auth";
import ThemeToggle from "../components/ThemeToggle";

type ProfileForm = {
  email: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  phone: string;
  bio: string;
  gender: string;
  dob: string;
  current_address: string;
  permanent_address: string;
  language: string;
};

type ProfileUser = {
  email?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  phone?: string;
};

type PasswordForm = {
  old_password: string;
  new_password: string;
  confirm_password: string;
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

export default function RecruiterProfile() {
  const navigate = useNavigate();
  const profileImageInputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [form, setForm] = useState<ProfileForm>({
    email: "",
    first_name: "",
    middle_name: "",
    bio: "",
    gender: "",
    dob: "",
    current_address: "",
    permanent_address: "",
    language: "",
    last_name: "",
    phone: "",
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  const inputClassName =
    "mt-1 w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-cyan-400";

  const sectionClassName =
    "rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/50";

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError("");

      try {
        const profile = await getProfile();
        const profileUser =
          profile.user && typeof profile.user === "object" ? (profile.user as ProfileUser) : null;
        setForm({
          email: profileUser?.email || profile.email || "",
          first_name: profileUser?.first_name || profile.first_name || "",
          middle_name: profileUser?.middle_name || profile.middle_name || "",
          last_name: profileUser?.last_name || profile.last_name || "",
          phone: profileUser?.phone || profile.phone || "",
          bio: profile.bio || "",
          gender: profile.gender || "",
          dob: profile.dob || "",
          current_address: profile.current_address || "",
          permanent_address: profile.permanent_address || "",
          language: profile.language || "",
        });
        if (profile.profile_image) {
          setProfileImagePreview(profile.profile_image);
        }
      } catch (err) {
        setError(getErrorMessage(err, "Could not load profile."));
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const fullName = useMemo(() => {
    return [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(" ").trim();
  }, [form.first_name, form.middle_name, form.last_name]);

  const handleProfileImageSelect = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }

    setProfileImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfileImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const payload = {
      first_name: form.first_name.trim(),
      middle_name: form.middle_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim(),
      bio: form.bio.trim() || undefined,
      gender: form.gender.trim() || undefined,
      dob: form.dob || undefined,
      current_address: form.current_address.trim() || undefined,
      permanent_address: form.permanent_address.trim() || undefined,
      language: form.language.trim() || undefined,
      profile_image: profileImageFile,
    };

    setIsSaving(true);

    try {
      const updated = await patchProfile(payload as any);
      const updatedUser =
        updated.user && typeof updated.user === "object" ? (updated.user as ProfileUser) : null;
      setForm((prev) => ({
        ...prev,
        email: updatedUser?.email || updated.email || prev.email,
        first_name: updatedUser?.first_name || updated.first_name || "",
        middle_name: updatedUser?.middle_name || updated.middle_name || "",
        last_name: updatedUser?.last_name || updated.last_name || "",
        phone: updatedUser?.phone || updated.phone || "",
        bio: updated.bio || "",
        gender: updated.gender || "",
        dob: updated.dob || "",
        current_address: updated.current_address || "",
        permanent_address: updated.permanent_address || "",
        language: updated.language || "",
      }));
      if (updated.profile_image) {
        setProfileImagePreview(updated.profile_image);
      }
      setProfileImageFile(null);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(getErrorMessage(err, "Could not update profile."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New password and confirm password must match.");
      return;
    }

    if (!isStrongPassword(passwordForm.new_password)) {
      setPasswordError(
        "Use a stronger password: at least 8 characters with uppercase, lowercase, number, and symbol.",
      );
      return;
    }

    if (!form.email.trim()) {
      setPasswordError("Your email is required to change password.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await changePassword({
        email: form.email.trim().toLowerCase(),
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
        confirm_password: passwordForm.confirm_password,
      });
      setPasswordMessage(res.message || "Password changed successfully.");
      setPasswordForm({ old_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setPasswordError(getErrorMessage(err, "Could not change password."));
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-cyan-50 to-blue-100 px-4 py-8 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
      <ThemeToggle compact />
      <section className="mx-auto w-full max-w-5xl rounded-3xl border border-white/40 bg-white/50 p-5 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/40 sm:p-7">
        <header className="mb-6">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Recruiter Profile</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Manage your account details and keep your security settings up to date.
          </p>
        </header>

        {error && <p className="mb-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        {success && <p className="mb-3 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">{success}</p>}

        <form className="space-y-5" onSubmit={handleSaveProfile}>
          <div className={sectionClassName}>
            <h3 className="mb-4 text-base font-semibold">Profile Picture</h3>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <input
                ref={profileImageInputRef}
                id="profile-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleProfileImageSelect(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                className="flex min-h-28 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm font-medium text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                onClick={() => profileImageInputRef.current?.click()}
              >
                <ImagePlus size={18} />
                {profileImageFile ? "Change photo" : "Upload photo"}
              </button>
              {profileImagePreview && (
                <button
                  type="button"
                  className="h-28 w-28 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                  onClick={() => profileImageInputRef.current?.click()}
                  aria-label="Change profile picture"
                >
                  <img src={profileImagePreview} alt="Profile preview" className="h-full w-full object-cover" />
                </button>
              )}
            </div>
          </div>

          <div className={sectionClassName}>
            <h3 className="mb-4 text-base font-semibold">Basic Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="profile-email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <input id="profile-email" value={form.email} type="email" disabled className={`${inputClassName} cursor-not-allowed opacity-80`} />
              </div>
              <div>
                <label htmlFor="profile-phone" className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                <input id="profile-phone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="98XXXXXXXX" required className={inputClassName} />
              </div>
              <div>
                <label htmlFor="profile-first" className="text-sm font-medium text-slate-700 dark:text-slate-300">First Name *</label>
                <input id="profile-first" value={form.first_name} onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))} required className={inputClassName} />
              </div>
              <div>
                <label htmlFor="profile-middle" className="text-sm font-medium text-slate-700 dark:text-slate-300">Middle Name</label>
                <input id="profile-middle" value={form.middle_name} onChange={(e) => setForm((prev) => ({ ...prev, middle_name: e.target.value }))} className={inputClassName} />
              </div>
              <div>
                <label htmlFor="profile-last" className="text-sm font-medium text-slate-700 dark:text-slate-300">Last Name *</label>
                <input id="profile-last" value={form.last_name} onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))} required className={inputClassName} />
              </div>
              <div>
                <label htmlFor="profile-fullname" className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                <input id="profile-fullname" value={fullName} disabled className={`${inputClassName} cursor-not-allowed opacity-80`} />
              </div>
            </div>
          </div>

          <div className={sectionClassName}>
            <h3 className="mb-4 text-base font-semibold">Personal Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="profile-gender" className="text-sm font-medium text-slate-700 dark:text-slate-300">Gender</label>
                <select id="profile-gender" value={form.gender} onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value }))} className={inputClassName}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="profile-dob" className="text-sm font-medium text-slate-700 dark:text-slate-300">Date of Birth</label>
                <input id="profile-dob" type="date" value={form.dob} onChange={(e) => setForm((prev) => ({ ...prev, dob: e.target.value }))} className={inputClassName} />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="profile-language" className="text-sm font-medium text-slate-700 dark:text-slate-300">Language</label>
                <input id="profile-language" placeholder="e.g., English, Nepali" value={form.language} onChange={(e) => setForm((prev) => ({ ...prev, language: e.target.value }))} className={inputClassName} />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="profile-bio" className="text-sm font-medium text-slate-700 dark:text-slate-300">Bio</label>
                <textarea id="profile-bio" rows={4} placeholder="Tell us about yourself..." value={form.bio} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} className={inputClassName} />
              </div>
            </div>
          </div>

          <div className={sectionClassName}>
            <h3 className="mb-4 text-base font-semibold">Address Information</h3>
            <div className="grid gap-4">
              <div>
                <label htmlFor="profile-current" className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Address</label>
                <input id="profile-current" placeholder="Street address, city, country" value={form.current_address} onChange={(e) => setForm((prev) => ({ ...prev, current_address: e.target.value }))} className={inputClassName} />
              </div>
              <div>
                <label htmlFor="profile-permanent" className="text-sm font-medium text-slate-700 dark:text-slate-300">Permanent Address</label>
                <input id="profile-permanent" placeholder="Street address, city, country" value={form.permanent_address} onChange={(e) => setForm((prev) => ({ ...prev, permanent_address: e.target.value }))} className={inputClassName} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={isLoading || isSaving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-blue-700 disabled:opacity-60">
            <Save size={16} />
            {isSaving ? "Saving..." : "Save Profile"}
          </button>
        </form>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/50">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
            <KeyRound size={18} />
            Change Password
          </h2>

          {passwordError && <p className="mt-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">{passwordError}</p>}
          {passwordMessage && <p className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">{passwordMessage}</p>}

          <form className="mt-4 space-y-4" onSubmit={handleChangePassword}>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="old-password" className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Password</label>
                <input id="old-password" type="password" value={passwordForm.old_password} onChange={(e) => setPasswordForm((prev) => ({ ...prev, old_password: e.target.value }))} autoComplete="current-password" required className={inputClassName} />
              </div>
              <div>
                <label htmlFor="new-password" className="text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
                <input id="new-password" type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))} autoComplete="new-password" required className={inputClassName} />
              </div>
              <div>
                <label htmlFor="confirm-password" className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirm New Password</label>
                <input id="confirm-password" type="password" value={passwordForm.confirm_password} onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))} autoComplete="new-password" required className={inputClassName} />
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">Minimum 8 characters with uppercase, lowercase, number, and special symbol.</p>

            <button type="submit" className="inline-flex items-center justify-center rounded-xl border border-cyan-500 px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50 disabled:opacity-60 dark:border-cyan-400 dark:text-cyan-300 dark:hover:bg-cyan-400/10" disabled={isChangingPassword}>
              {isChangingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
