import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, UserCircle2 } from "lucide-react";
import { createCompany, getCompanyStatus, patchCompany } from "../api/company";
import { ROUTES } from "../routes/paths";
import { resolveRecruiterCompanyStage, saveRecruiterCompanyStage } from "../utils/authSession";
import LocationPicker from "../components/LocationPicker";
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

const INDUSTRIES = [
  "Software & IT",
  "Finance & Banking",
  "Healthcare & Pharma",
  "Consulting",
  "E-commerce",
  "Manufacturing",
  "Automotive",
  "Real Estate",
  "Education",
  "Media & Entertainment",
  "Telecommunications",
  "Energy & Utilities",
  "Retail",
  "Hospitality & Travel",
  "Other",
];

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "200+"];

const COUNTRIES = [
  "Nepal",
  "India",
  "Pakistan",
  "Bangladesh",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Other",
];

const createInitialForm = () => ({
  name: "",
  website: "",
  description: "",
  industry: "",
  company_size: "",
  location: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  country: "Nepal",
  postal_code: "",
  latitude: "",
  longitude: "",
  email: "",
  phone: "",
  contact_person_name: "",
  contact_person_email: "",
  contact_person_phone: "",
  contact_person_designation: "",
});

const mapCompanyToForm = (company: Record<string, any>) => ({
  name: company?.name ?? "",
  website: company?.website ?? "",
  description: company?.description ?? "",
  industry: company?.industry ?? "",
  company_size: company?.company_size ?? company?.size ?? "",
  location: company?.location ?? "",
  address_line1: company?.address_line1 ?? "",
  address_line2: company?.address_line2 ?? "",
  city: company?.city ?? "",
  state: company?.state ?? "",
  country: company?.country ?? "Nepal",
  postal_code: company?.postal_code ?? "",
  latitude: company?.latitude ? String(company.latitude) : "",
  longitude: company?.longitude ? String(company.longitude) : "",
  email: company?.email ?? "",
  phone: company?.phone ?? "",
  contact_person_name: company?.contact_person_name ?? "",
  contact_person_email: company?.contact_person_email ?? "",
  contact_person_phone: company?.contact_person_phone ?? "",
  contact_person_designation: company?.contact_person_designation ?? "",
});

const LOGO_MAX_MB = 5;

export default function CreateCompany() {
  const navigate = useNavigate();
  const location = useLocation();
  const isEditMode = location.pathname === ROUTES.recruiter.editCompany;
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrating, setIsHydrating] = useState(isEditMode);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [companyId, setCompanyId] = useState<string | number | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [existingLogoUrl, setExistingLogoUrl] = useState("");
  const [form, setForm] = useState(createInitialForm);

  const fieldBaseClass =
    "mt-1 w-full rounded-xl border bg-white/90 px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-4 focus:ring-cyan-500/20 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:ring-cyan-400/20";
  const getFieldClassName = (hasError?: boolean) =>
    `${fieldBaseClass} ${
      hasError
        ? "border-rose-400 focus:border-rose-500 dark:border-rose-500"
        : "border-slate-300 focus:border-cyan-500 dark:border-slate-700 dark:focus:border-cyan-400"
    }`;

  useEffect(() => {
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    let isMounted = true;

    const ensureCreateOnlyForNewCompany = async () => {
      try {
        const res = await getCompanyStatus();
        const company = (res as any)?.company || null;

        if (!isMounted || !company) {
          return;
        }

        const stage = resolveRecruiterCompanyStage(res as any);
        saveRecruiterCompanyStage(stage);

        if (stage === "approved") {
          navigate(ROUTES.dashboard.recruiter, { replace: true });
          return;
        }

        navigate(ROUTES.recruiter.editCompany, { replace: true });
      } catch {
        // Keep create flow available if status check is temporarily unavailable.
      }
    };

    ensureCreateOnlyForNewCompany();

    return () => {
      isMounted = false;
    };
  }, [isEditMode, navigate]);

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    let isMounted = true;

    const hydrateExistingCompany = async () => {
      try {
        const res = await getCompanyStatus();
        const company = (res as any)?.company || null;

        if (!isMounted || !company) {
          return;
        }

        setCompanyId(company.id ?? null);
        setForm(mapCompanyToForm(company));
        setExistingLogoUrl(typeof company.logo === "string" ? company.logo : "");
      } catch (err: unknown) {
        if (isMounted) {
          setError(getErrorMessage(err, "Could not load your company details for editing."));
        }
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    };

    hydrateExistingCompany();

    return () => {
      isMounted = false;
    };
  }, [isEditMode]);

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!form.name.trim()) {
        errors.name = "Company name is required";
      }

      if (form.website.trim() && !form.website.startsWith("http")) {
        errors.website = "Website must start with http:// or https://";
      }

      if (!form.description.trim()) {
        errors.description = "Description is required";
      } else if (form.description.trim().length < 20) {
        errors.description = "Description should be at least 20 characters";
      }

      if (!form.industry) {
        errors.industry = "Please select an industry";
      }

      if (!form.company_size) {
        errors.company_size = "Please select company size";
      }

      if (!form.email.trim()) {
        errors.email = "Company email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        errors.email = "Invalid company email format";
      }
    } else if (step === 2) {
      if (!form.address_line1.trim()) {
        errors.address_line1 = "Address line 1 is required";
      }

      if (!form.city.trim()) {
        errors.city = "City is required";
      }

      if (!form.country) {
        errors.country = "Country is required";
      }
    } else if (step === 3) {
      if (
        form.contact_person_email.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_person_email)
      ) {
        errors.contact_person_email = "Invalid email format";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFieldChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleLogoSelect = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file for company logo.");
      return;
    }

    if (file.size > LOGO_MAX_MB * 1024 * 1024) {
      setError(`Logo file must be under ${LOGO_MAX_MB}MB.`);
      return;
    }

    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }

    setError("");
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStepJump = (targetStep: number) => {
    if (isEditMode) {
      setCurrentStep(targetStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Keep guided validation in create mode.
    if (targetStep <= currentStep) {
      setCurrentStep(targetStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (validateStep(currentStep)) {
      setCurrentStep(targetStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!validateStep(3)) {
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        name: form.name.trim(),
        logo: logoFile || undefined,
        website: form.website.trim() || undefined,
        description: form.description.trim(),
        industry: form.industry.trim(),
        size: form.company_size.trim(),
        company_size: form.company_size.trim(),
        location: form.location.trim() || undefined,
        address_line1: form.address_line1.trim(),
        address_line2: form.address_line2.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim() || undefined,
        country: form.country,
        postal_code: form.postal_code.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        contact_person_name: form.contact_person_name.trim(),
        contact_person_email: form.contact_person_email.trim(),
        contact_person_phone: form.contact_person_phone.trim(),
        contact_person_designation: form.contact_person_designation.trim(),
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
      } as any;

      if (isEditMode) {
        if (!companyId) {
          throw new Error("Company record was not found for editing.");
        }

        // Sensitive trust fields are locked for direct edits and require separate review workflows.
        delete payload.name;
        delete payload.email;
        delete payload.location;
        delete payload.address_line1;
        delete payload.address_line2;
        delete payload.city;
        delete payload.state;
        delete payload.country;
        delete payload.postal_code;
        delete payload.latitude;
        delete payload.longitude;

        await patchCompany(companyId, payload);
        navigate(ROUTES.dashboard.recruiter, { replace: true });
      } else {
        await createCompany(payload);
        saveRecruiterCompanyStage("pending-approval");
        navigate(ROUTES.recruiter.pendingApproval, { replace: true });
      }
    } catch (err: unknown) {
      const message = getErrorMessage(
        err,
        isEditMode
          ? "Could not update company details. Please try again."
          : "Could not create company. Please try again.",
      );

      if (!isEditMode && /already.*company|owner.*already|already exists/i.test(message.toLowerCase())) {
        try {
          const status = await getCompanyStatus();
          const stage = resolveRecruiterCompanyStage(status as any);
          saveRecruiterCompanyStage(stage);

          if (stage === "approved") {
            navigate(ROUTES.dashboard.recruiter, { replace: true });
            return;
          }

          navigate(ROUTES.recruiter.editCompany, { replace: true });
          return;
        } catch {
          navigate(ROUTES.recruiter.editCompany, { replace: true });
          return;
        }
      }

      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-cyan-50 to-blue-100 px-4 py-8 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
      <ThemeToggle compact />

      <section className="mx-auto w-full max-w-5xl rounded-3xl border border-white/40 bg-white/65 p-5 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/45 sm:p-7">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-blue-300/70 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
            onClick={() => navigate(ROUTES.recruiter.profile)}
          >
            <UserCircle2 size={16} />
            Profile
          </button>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((step) => {
            const labels = ["Company Info", "Location", "Contact"];
            const active = currentStep >= step;
            const done = currentStep > step;

            return (
              <button
                key={step}
                type="button"
                onClick={() => handleStepJump(step)}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                  active
                    ? "border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-300"
                    : "border-slate-300 bg-white/70 text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
                } ${isEditMode || step <= currentStep ? "cursor-pointer hover:border-cyan-300" : "cursor-not-allowed opacity-70"}`}
                disabled={!isEditMode && step > currentStep + 1}
              >
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">
                  {done ? "OK" : step}
                </span>
                {labels[step - 1]}
              </button>
            );
          })}
        </div>

        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-300">Step {currentStep} of 3</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {isEditMode
              ? currentStep === 1
                ? "Edit Company Information"
                : currentStep === 2
                  ? "Update Company Location"
                  : "Update Contact Details"
              : currentStep === 1
                ? "Company Information"
                : currentStep === 2
                  ? "Company Location"
                  : "Contact Details"}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {isEditMode
              ? "Review and update your company profile. Changes will remain under review until approved."
              : currentStep === 1
                ? "Provide your company's basic details, website, and industry information."
                : currentStep === 2
                  ? "Enter your company's address and location details for our records."
                  : "Add key contact information for company and contact person."}
          </p>
        </div>

        {isEditMode && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertCircle size={16} />
            <p>For compliance and account integrity, Company Name, Official Company Email, and Registered Address/Location are restricted fields and cannot be edited here.</p>
          </div>
        )}

        {isEditMode && isHydrating && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300">
            <Loader2 size={16} className="animate-spin" />
            <p>Loading your company details...</p>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          {currentStep === 1 && (
            <>
              <div>
                <label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Company Name <span className="text-rose-600">*</span>
                </label>
                <input id="name" type="text" placeholder="Apex Hiring Pvt. Ltd." value={form.name} onChange={(e) => handleFieldChange("name", e.target.value)} className={getFieldClassName(Boolean(validationErrors.name))} disabled={isEditMode} />
                {isEditMode && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Locked in edit mode</span>}
                {validationErrors.name && <span className="mt-1 block text-xs text-rose-600 dark:text-rose-300">{validationErrors.name}</span>}
              </div>

              <div>
                <label htmlFor="website" className="text-sm font-medium text-slate-700 dark:text-slate-300">Website <span className="text-slate-500">(Optional)</span></label>
                <input id="website" type="url" placeholder="https://example.com" value={form.website} onChange={(e) => handleFieldChange("website", e.target.value)} className={getFieldClassName(Boolean(validationErrors.website))} />
                {validationErrors.website && <span className="mt-1 block text-xs text-rose-600 dark:text-rose-300">{validationErrors.website}</span>}
              </div>

              <div>
                <label htmlFor="company_logo" className="text-sm font-medium text-slate-700 dark:text-slate-300">Company Logo <span className="text-slate-500">(Optional)</span></label>
                <div className="mt-1 rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="mb-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <ImagePlus size={18} />
                    <div>
                      <p className="font-semibold">Upload a brand logo</p>
                      <span className="text-xs text-slate-500 dark:text-slate-400">PNG, JPG, WEBP up to {LOGO_MAX_MB}MB</span>
                    </div>
                  </div>
                  <input id="company_logo" type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoSelect(e.target.files?.[0] || null)} />
                  <label htmlFor="company_logo" className="flex min-h-24 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300">
                    <ImagePlus size={20} />
                    <span>{logoFile ? "Change logo" : "Choose logo image"}</span>
                  </label>
                  {(logoPreview || existingLogoUrl) && (
                    <div className="mt-3 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
                      <img src={logoPreview || existingLogoUrl} alt="Company logo preview" className="h-20 w-20 rounded-lg object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="industry" className="text-sm font-medium text-slate-700 dark:text-slate-300">Industry <span className="text-rose-600">*</span></label>
                  <select id="industry" value={form.industry} onChange={(e) => handleFieldChange("industry", e.target.value)} className={getFieldClassName(Boolean(validationErrors.industry))}>
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                  {validationErrors.industry && <span className="mt-1 block text-xs text-rose-600 dark:text-rose-300">{validationErrors.industry}</span>}
                </div>
                <div>
                  <label htmlFor="company_size" className="text-sm font-medium text-slate-700 dark:text-slate-300">Company Size <span className="text-rose-600">*</span></label>
                  <select id="company_size" value={form.company_size} onChange={(e) => handleFieldChange("company_size", e.target.value)} className={getFieldClassName(Boolean(validationErrors.company_size))}>
                    <option value="">Select size</option>
                    {COMPANY_SIZES.map((size) => (
                      <option key={size} value={size}>{size} employees</option>
                    ))}
                  </select>
                  {validationErrors.company_size && <span className="mt-1 block text-xs text-rose-600 dark:text-rose-300">{validationErrors.company_size}</span>}
                </div>
              </div>

              <div>
                <label htmlFor="description" className="text-sm font-medium text-slate-700 dark:text-slate-300">Company Description <span className="text-rose-600">*</span></label>
                <textarea id="description" rows={5} placeholder="Tell us about your company, mission, and hiring goals..." value={form.description} onChange={(e) => handleFieldChange("description", e.target.value)} className={getFieldClassName(Boolean(validationErrors.description))} />
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{form.description.length}/500 characters</span>
                {validationErrors.description && <span className="mt-1 block text-xs text-rose-600 dark:text-rose-300">{validationErrors.description}</span>}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Company Email <span className="text-rose-600">*</span></label>
                  <input id="email" type="email" placeholder="info@company.com" value={form.email} onChange={(e) => handleFieldChange("email", e.target.value)} className={getFieldClassName(Boolean(validationErrors.email))} disabled={isEditMode} />
                  {isEditMode && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Locked in edit mode</span>}
                  {validationErrors.email && <span className="mt-1 block text-xs text-rose-600 dark:text-rose-300">{validationErrors.email}</span>}
                </div>
                <div>
                  <label htmlFor="phone" className="text-sm font-medium text-slate-700 dark:text-slate-300">Company Phone</label>
                  <input id="phone" type="tel" placeholder="+977 1 4123456" value={form.phone} onChange={(e) => handleFieldChange("phone", e.target.value)} className={getFieldClassName(false)} />
                </div>
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <div>
                <label htmlFor="address_line1" className="text-sm font-medium text-slate-700 dark:text-slate-300">Address Line 1 <span className="text-rose-600">*</span></label>
                <input id="address_line1" type="text" placeholder="Street address" value={form.address_line1} onChange={(e) => handleFieldChange("address_line1", e.target.value)} className={getFieldClassName(Boolean(validationErrors.address_line1))} disabled={isEditMode} />
                {isEditMode && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Locked in edit mode</span>}
                {validationErrors.address_line1 && <span className="mt-1 block text-xs text-rose-600 dark:text-rose-300">{validationErrors.address_line1}</span>}
              </div>

              <div>
                <label htmlFor="address_line2" className="text-sm font-medium text-slate-700 dark:text-slate-300">Address Line 2</label>
                <input id="address_line2" type="text" placeholder="Apartment, suite, etc. (optional)" value={form.address_line2} onChange={(e) => handleFieldChange("address_line2", e.target.value)} className={getFieldClassName(false)} disabled={isEditMode} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="city" className="text-sm font-medium text-slate-700 dark:text-slate-300">City <span className="text-rose-600">*</span></label>
                  <input id="city" type="text" placeholder="Kathmandu" value={form.city} onChange={(e) => handleFieldChange("city", e.target.value)} className={getFieldClassName(Boolean(validationErrors.city))} disabled={isEditMode} />
                  {validationErrors.city && <span className="mt-1 block text-xs text-rose-600 dark:text-rose-300">{validationErrors.city}</span>}
                </div>
                <div>
                  <label htmlFor="state" className="text-sm font-medium text-slate-700 dark:text-slate-300">State/Province</label>
                  <input id="state" type="text" placeholder="Bagmati" value={form.state} onChange={(e) => handleFieldChange("state", e.target.value)} className={getFieldClassName(false)} disabled={isEditMode} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="country" className="text-sm font-medium text-slate-700 dark:text-slate-300">Country <span className="text-rose-600">*</span></label>
                  <select id="country" value={form.country} onChange={(e) => handleFieldChange("country", e.target.value)} className={getFieldClassName(Boolean(validationErrors.country))} disabled={isEditMode}>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {validationErrors.country && <span className="mt-1 block text-xs text-rose-600 dark:text-rose-300">{validationErrors.country}</span>}
                </div>
                <div>
                  <label htmlFor="postal_code" className="text-sm font-medium text-slate-700 dark:text-slate-300">Postal Code</label>
                  <input id="postal_code" type="text" placeholder="44600" value={form.postal_code} onChange={(e) => handleFieldChange("postal_code", e.target.value)} className={getFieldClassName(false)} disabled={isEditMode} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Location On Map</label>
                <div className="mt-2 rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                  {isEditMode ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Latitude</label>
                        <input type="text" readOnly value={form.latitude} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Longitude</label>
                        <input type="text" readOnly value={form.longitude} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
                      </div>
                    </div>
                  ) : (
                    <LocationPicker
                      latitude={form.latitude}
                      longitude={form.longitude}
                      onLocationChange={(lat, lng) => {
                        handleFieldChange("latitude", lat);
                        handleFieldChange("longitude", lng);
                      }}
                      onError={(err) => setError(err)}
                    />
                  )}
                </div>
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                Contact Person Details (Recruiter)
              </div>
              <div>
                <label htmlFor="contact_person_name" className="text-sm font-medium text-slate-700 dark:text-slate-300">Contact Person Name <span className="text-slate-500">(Optional)</span></label>
                <input id="contact_person_name" type="text" placeholder="Full name" value={form.contact_person_name} onChange={(e) => handleFieldChange("contact_person_name", e.target.value)} className={getFieldClassName(Boolean(validationErrors.contact_person_name))} />
                {validationErrors.contact_person_name && <span className="mt-1 block text-xs text-rose-600 dark:text-rose-300">{validationErrors.contact_person_name}</span>}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="contact_person_email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Contact Email <span className="text-slate-500">(Optional)</span></label>
                  <input id="contact_person_email" type="email" placeholder="person@company.com" value={form.contact_person_email} onChange={(e) => handleFieldChange("contact_person_email", e.target.value)} className={getFieldClassName(Boolean(validationErrors.contact_person_email))} />
                  {validationErrors.contact_person_email && <span className="mt-1 block text-xs text-rose-600 dark:text-rose-300">{validationErrors.contact_person_email}</span>}
                </div>
                <div>
                  <label htmlFor="contact_person_phone" className="text-sm font-medium text-slate-700 dark:text-slate-300">Contact Phone <span className="text-slate-500">(Optional)</span></label>
                  <input id="contact_person_phone" type="tel" placeholder="+977 98..." value={form.contact_person_phone} onChange={(e) => handleFieldChange("contact_person_phone", e.target.value)} className={getFieldClassName(Boolean(validationErrors.contact_person_phone))} />
                  {validationErrors.contact_person_phone && <span className="mt-1 block text-xs text-rose-600 dark:text-rose-300">{validationErrors.contact_person_phone}</span>}
                </div>
              </div>
              <div>
                <label htmlFor="contact_person_designation" className="text-sm font-medium text-slate-700 dark:text-slate-300">Designation <span className="text-slate-500">(Optional)</span></label>
                <input id="contact_person_designation" type="text" placeholder="HR Manager, Recruiter, etc." value={form.contact_person_designation} onChange={(e) => handleFieldChange("contact_person_designation", e.target.value)} className={getFieldClassName(Boolean(validationErrors.contact_person_designation))} />
                {validationErrors.contact_person_designation && <span className="mt-1 block text-xs text-rose-600 dark:text-rose-300">{validationErrors.contact_person_designation}</span>}
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 size={16} />
                <p>This contact person will be the primary liaison with our team for company verification and hiring operations.</p>
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {currentStep > 1 && (
              <button type="button" className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800" onClick={handlePrevStep}>
                {"<- Previous"}
              </button>
            )}
            {currentStep < 3 ? (
              <button type="button" className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-blue-700" onClick={handleNextStep}>
                {"Next ->"}
              </button>
            ) : (
              <button type="submit" disabled={isLoading || isHydrating} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-blue-700 disabled:opacity-60">
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {isEditMode ? "Saving..." : "Submitting..."}
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    {isEditMode ? "Save Changes" : "Submit for Approval"}
                  </>
                )}
              </button>
            )}
          </div>
        </form>

        <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">
          {isEditMode
            ? "After saving, your updated company profile will continue under admin review."
            : "After submission, your company profile will be reviewed by our admin team. This typically takes 24-48 hours."}
        </p>
      </section>
    </main>
  );
}
