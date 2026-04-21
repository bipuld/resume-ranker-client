import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowUp,
  Bot,
  Building2,
  BriefcaseBusiness,
  CalendarClock,
  CircleUserRound,
  Clock3,
  CloudSun,
  Cpu,
  FileSpreadsheet,
  LogOut,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Target,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import atsIcon from "../assets/ats-icon.svg";
import ThemeToggle from "../components/ThemeToggle";
import {
  getAdminCompanies,
  getAdminCompany,
  getCompanyMembers,
  inviteCompanyMember,
  unverifyAdminCompany,
  verifyAdminCompany,
} from "../api/company";
import type {
  CompanyApprovedMember,
  CompanyDetailResponse,
  CompanyListResponse,
  CompanyMember,
  CompanyMemberRole,
} from "../types/company";
import { ROUTES } from "../routes/paths";
import { resolveBackendUrl } from "../config/api";
import { clearAuthSession, getAuthRole } from "../utils/authSession";
import "./AdminDashboard.css";

const pipelineSummary = [
  { label: "Open Roles", value: 18, trend: "+3 this week" },
  { label: "Candidates In Pipeline", value: 246, trend: "+21 this week" },
  { label: "Interviews Scheduled", value: 37, trend: "+8 today" },
  { label: "Offers Released", value: 11, trend: "+2 this week" },
];

const hiringVelocity = [
  { month: "Jan", candidates: 120, interviews: 31, offers: 8 },
  { month: "Feb", candidates: 140, interviews: 35, offers: 9 },
  { month: "Mar", candidates: 165, interviews: 42, offers: 11 },
  { month: "Apr", candidates: 181, interviews: 48, offers: 14 },
  { month: "May", candidates: 196, interviews: 53, offers: 16 },
  { month: "Jun", candidates: 214, interviews: 57, offers: 18 },
];

const sourceDistribution = [
  { name: "LinkedIn", value: 42 },
  { name: "Referral", value: 27 },
  { name: "Career Page", value: 19 },
  { name: "Job Boards", value: 12 },
];

const recruiterOutput = [
  { recruiter: "Anita", hires: 14, interviews: 46 },
  { recruiter: "Rohan", hires: 9, interviews: 34 },
  { recruiter: "Mina", hires: 11, interviews: 39 },
  { recruiter: "Sofia", hires: 12, interviews: 41 },
];

const sourcePalette = ["#0f766e", "#15803d", "#b45309", "#2563eb"];
const SECTION_IDS = [
  "overview",
  "erp-core",
  "ai-monitor",
  "charts",
  "company-verification",
  "recruiter-management",
  "pipeline-health",
  "quick-actions",
] as const;

type CompanyFilter = "all" | "verified" | "pending";

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

const erpModules = [
  {
    title: "Talent Acquisition",
    owner: "Talent Ops",
    status: "Healthy",
    summary: "18 active requisitions and 246 candidates in motion",
    icon: Users,
  },
  {
    title: "Finance & Budget",
    owner: "Finance",
    status: "Review",
    summary: "Q2 hiring burn at 61%, forecast still on target",
    icon: FileSpreadsheet,
  },
  {
    title: "System Controls",
    owner: "Admin Security",
    status: "Healthy",
    summary: "No policy violations detected in last 7 days",
    icon: ShieldCheck,
  },
  {
    title: "Automation Engine",
    owner: "Platform",
    status: "Attention",
    summary: "2 interview automation rules need approval",
    icon: Cpu,
  },
];

const approvalQueue = [
  { task: "Approve recruiter seat for Sales", by: "Ops Lead", priority: "High" },
  { task: "Release referral payout batch", by: "Finance", priority: "Medium" },
  { task: "Publish new backend role template", by: "Hiring Manager", priority: "Low" },
];

const hiringFocus = [
  "Finalize Senior Frontend shortlist",
  "Approve recruiter seats for Q2",
  "Review candidate drop-offs at screening stage",
  "Sync with HR operations on onboarding SLAs",
];

const ownerStatus = [
  { label: "ATS API Uptime", value: "99.98%", state: "Healthy" },
  { label: "Queue Processing", value: "1.4s avg", state: "Healthy" },
  { label: "SLA Breach Risk", value: "2 roles", state: "Review" },
  { label: "Security Alerts", value: "0 open", state: "Healthy" },
];

const aiOpsMetrics = [
  { label: "Resume Parse Success", value: "97.6%", status: "Healthy" },
  { label: "ATS Scoring Latency", value: "780ms", status: "Healthy" },
  { label: "Model Drift Risk", value: "Low", status: "Healthy" },
  { label: "Parser Failures (24h)", value: "6", status: "Review" },
];

const atsScoreBands = [
  { band: "0.0-0.2", candidates: 18 },
  { band: "0.2-0.4", candidates: 44 },
  { band: "0.4-0.6", candidates: 78 },
  { band: "0.6-0.8", candidates: 62 },
  { band: "0.8-1.0", candidates: 30 },
];

const aiEventFeed = [
  { time: "08:42", event: "TF-IDF scoring executed", detail: "34 applications scored", severity: "Healthy" },
  { time: "08:31", event: "DOCX parser warning", detail: "2 files require fallback parser", severity: "Review" },
  { time: "08:20", event: "Resume ingestion queue", detail: "Queue size normalized (12 -> 4)", severity: "Healthy" },
];

const roleAccessMatrix = [
  { role: "Admin", scope: "Full system", actions: "All CRUD, monitoring, config" },
  { role: "Recruiter", scope: "Own jobs", actions: "Manage jobs, rank applicants" },
  { role: "Candidate", scope: "Own profile", actions: "Upload resume, apply, track status" },
];

const pickFirstString = (...values: Array<unknown>) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
};

const getApprovedMemberDetails = (member: CompanyApprovedMember | CompanyMember) => {
  const memberRecord = member as Record<string, unknown>;
  const userRecord =
    typeof member.user === "object" && member.user !== null
      ? (member.user as Record<string, unknown>)
      : null;
  const profileRecord =
    typeof member.user_profile === "object" && member.user_profile !== null
      ? (member.user_profile as Record<string, unknown>)
      : null;

  const fullName = [
    pickFirstString(userRecord?.first_name, profileRecord?.first_name),
    pickFirstString(userRecord?.middle_name, profileRecord?.middle_name),
    pickFirstString(userRecord?.last_name, profileRecord?.last_name),
  ]
    .filter(Boolean)
    .join(" ");

  const email = pickFirstString(
    member.invite_email,
    userRecord?.email,
    memberRecord.email,
    profileRecord?.email,
  );

  const phone = pickFirstString(
    userRecord?.phone,
    memberRecord.phone,
    memberRecord.phone_number,
    profileRecord?.phone,
    profileRecord?.phone_number,
    profileRecord?.mobile,
  );

  const address = pickFirstString(
    profileRecord?.current_address,
    profileRecord?.permanent_address,
    memberRecord.address,
    memberRecord.location,
  );

  const profileImage = pickFirstString(
    memberRecord.user_profile_image,
    memberRecord.profile_image,
    memberRecord.profile_image_url,
    profileRecord?.profile_image,
    profileRecord?.profile_image_url,
  );

  const displayName = fullName || email || "Member";
  const roleLabel = typeof member.role === "string" ? member.role.replace(/_/g, " ") : "member";
  const designation = pickFirstString(member.designation, memberRecord.designation);
  const statusLabel =
    member.is_approved === true
      ? "Approved"
      : member.invite_status
        ? `${member.invite_status}`.replace(/_/g, " ")
        : "Pending";

  return {
    displayName,
    email: email || "Not provided",
    phone: phone || "Not provided",
    address: address || "Not provided",
    role: roleLabel,
    designation: designation || "Not provided",
    profileImage,
    createdAt: pickFirstString(member.created_at, memberRecord.created_at),
    isApproved: member.is_approved === true,
    statusLabel,
  };
};

type WeatherState = {
  location: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  updatedAt: string;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

const GEO_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 5 * 60 * 1000,
} as const;

const getWeatherCondition = (code: number) => {
  if (code === 0) return "Clear";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67].includes(code)) return "Rain";
  if ([71, 73, 75, 77].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([85, 86].includes(code)) return "Snow showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Unknown";
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("overview");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    companyId: "",
    email: "",
    role: "recruiter" as CompanyMemberRole,
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [weatherStatus, setWeatherStatus] = useState<"loading" | "ready" | "error">("loading");
  const [weatherError, setWeatherError] = useState("");
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [lastCoordinates, setLastCoordinates] = useState<Coordinates | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>("all");
  const [companies, setCompanies] = useState<CompanyDetailResponse[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetailResponse | null>(null);
  const [selectedCompanyMembers, setSelectedCompanyMembers] = useState<Array<CompanyApprovedMember | CompanyMember>>([]);
  const [selectedCompanyMembersLoading, setSelectedCompanyMembersLoading] = useState(false);
  const [selectedCompanyMembersError, setSelectedCompanyMembersError] = useState("");
  const [activeCompanyActionId, setActiveCompanyActionId] = useState<string | number | null>(null);
  const [aiControls, setAiControls] = useState({
    autoScoring: true,
    strictFileValidation: true,
    anomalyAlerts: true,
  });

  const greetingLabel = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, [currentTime]);

  const currentRole = getAuthRole();

  const toDisplay = (value?: string | number | null) => {
    if (value === null || value === undefined) {
      return "Not provided";
    }

    const text = String(value).trim();
    return text ? text : "Not provided";
  };

  const formatCompanyAddress = (company: CompanyDetailResponse) => {
    const primary = [company.address_line1, company.address_line2].filter(Boolean).join(", ");
    const locality = [company.city, company.state, company.postal_code].filter(Boolean).join(", ");
    const country = company.country || "";
    const composed = [primary, locality, country].filter(Boolean).join(" | ");
    return composed || "Not provided";
  };

  const formatCompanyGeo = (company: CompanyDetailResponse) => {
    if (typeof company.latitude !== "number" || typeof company.longitude !== "number") {
      return "Not provided";
    }

    return `${company.latitude.toFixed(6)}, ${company.longitude.toFixed(6)}`;
  };

  const approvedMembers = useMemo(() => {
    return Array.isArray(selectedCompany?.approved_members) ? selectedCompany.approved_members : [];
  }, [selectedCompany?.approved_members]);

  const companyMembersForAdmin = useMemo(() => {
    return selectedCompanyMembers.length > 0 ? selectedCompanyMembers : approvedMembers;
  }, [selectedCompanyMembers, approvedMembers]);

  const activeRecruiterCount = useMemo(() => {
    return companies.reduce((total, company) => {
      const members = Array.isArray(company.approved_members) ? company.approved_members : [];
      const activeCount = members.filter((member) => member.is_active === true).length;
      return total + activeCount;
    }, 0);
  }, [companies]);

  const availableCompanies = useMemo(() => {
    return [...companies]
      .filter((company) => company.id)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [companies]);

  const resolveLogoUrl = (logo?: string | null) => {
    if (!logo) {
      return "";
    }

    if (/^https?:\/\//i.test(logo)) {
      return logo;
    }

    return resolveBackendUrl(logo);
  };

  const resolveProfileImageUrl = (image?: string | null) => {
    if (!image) {
      return "";
    }

    if (/^https?:\/\//i.test(image)) {
      return image;
    }

    return resolveBackendUrl(image);
  };

  const formatCreatedDate = (value?: string) => {
    if (!value) {
      return "Not provided";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Not provided";
    }

    return date.toLocaleDateString();
  };

  const normalizeCompanyList = (
    payload: CompanyListResponse | CompanyDetailResponse[],
  ): CompanyDetailResponse[] => {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload.results)) {
      return payload.results;
    }

    return [];
  };

  const loadMembersForSelectedCompany = useCallback(
    async (company: CompanyDetailResponse) => {
      const fallbackMembers = Array.isArray(company.approved_members) ? company.approved_members : [];
      if (!company.id) {
        setSelectedCompanyMembers(fallbackMembers);
        setSelectedCompanyMembersError("");
        return;
      }

      setSelectedCompanyMembersLoading(true);
      setSelectedCompanyMembersError("");

      try {
        const members = await getCompanyMembers(company.id);
        setSelectedCompanyMembers(members);
      } catch {
        setSelectedCompanyMembers(fallbackMembers);
        setSelectedCompanyMembersError("Showing approved members only. Full member list is currently unavailable.");
      } finally {
        setSelectedCompanyMembersLoading(false);
      }
    },
    [],
  );

  const loadCompanies = useCallback(
    async (filter: CompanyFilter = companyFilter) => {
      setCompaniesLoading(true);
      setCompaniesError("");

      try {
        const params =
          filter === "verified"
            ? { is_verified: true }
            : filter === "pending"
              ? { is_verified: false }
              : undefined;

        const res = await getAdminCompanies(params);
        const list = normalizeCompanyList(res);
        setCompanies(list);

        if (selectedCompany?.id) {
          const refreshed = list.find((company) => company.id === selectedCompany.id) || null;
          setSelectedCompany(refreshed);
        }
      } catch (err: unknown) {
        setCompaniesError(getErrorMessage(err, "Could not load company list right now."));
      } finally {
        setCompaniesLoading(false);
      }
    },
    [companyFilter, selectedCompany?.id],
  );

  const handleViewCompany = useCallback(async (id: string | number) => {
    setActiveCompanyActionId(id);
    setCompaniesError("");
    setSelectedCompanyMembers([]);
    setSelectedCompanyMembersError("");

    try {
      const company = await getAdminCompany(id);
      setSelectedCompany(company);
      await loadMembersForSelectedCompany(company);
    } catch (err: unknown) {
      setCompaniesError(getErrorMessage(err, "Could not load company details."));
    } finally {
      setActiveCompanyActionId(null);
    }
  }, [loadMembersForSelectedCompany]);

  const applyCompanyVerificationAction = useCallback(
    async (
      id: string | number,
      action: "toggle" | "verify" | "unverify",
    ) => {
      setActiveCompanyActionId(id);
      setCompaniesError("");

      try {
        const currentCompany = companies.find((company) => company.id === id);
        const isVerified = currentCompany?.is_verified === true;

        if (action === "toggle") {
          await verifyAdminCompany(id);
        } else if (action === "verify") {
          if (!isVerified) {
            await verifyAdminCompany(id);
          }
        } else if (isVerified) {
          await unverifyAdminCompany(id);
        }

        await loadCompanies();

        if (selectedCompany?.id === id) {
          const refreshed = await getAdminCompany(id);
          setSelectedCompany(refreshed);
          await loadMembersForSelectedCompany(refreshed);
        }
      } catch (err: unknown) {
        setCompaniesError(getErrorMessage(err, "Could not update company verification status."));
      } finally {
        setActiveCompanyActionId(null);
      }
    },
    [companies, loadCompanies, loadMembersForSelectedCompany, selectedCompany?.id],
  );

  useEffect(() => {
    void loadCompanies(companyFilter);
  }, [companyFilter, loadCompanies]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (mostVisible?.target?.id) {
          setActiveSection(mostVisible.target.id);
        }
      },
      {
        root: null,
        rootMargin: "-35% 0px -55% 0px",
        threshold: [0.1, 0.3, 0.6],
      },
    );

    SECTION_IDS.forEach((id) => {
      const section = document.getElementById(id);
      if (section) {
        observer.observe(section);
      }
    });

    return () => observer.disconnect();
  }, []);

  const loadWeatherForCoordinates = useCallback(async (
    latitude: number,
    longitude: number,
    fallbackLocation?: string,
  ) => {
    setWeatherStatus("loading");
    setWeatherError("");

    try {
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`,
      );

      if (!weatherRes.ok) {
        throw new Error("Weather API failed");
      }

      const weatherJson = (await weatherRes.json()) as {
        current?: {
          temperature_2m?: number;
          relative_humidity_2m?: number;
          apparent_temperature?: number;
          weather_code?: number;
          wind_speed_10m?: number;
          time?: string;
        };
      };

      let locationLabel = fallbackLocation || "Current location";

      try {
        const locationRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`,
        );

        if (locationRes.ok) {
          const locationJson = (await locationRes.json()) as {
            results?: Array<{ name?: string; admin1?: string; country?: string }>;
          };
          const place = locationJson.results?.[0];
          const resolved = [place?.name, place?.admin1, place?.country].filter(Boolean).join(", ");
          if (resolved) {
            locationLabel = resolved;
          }
        }
      } catch {
        // Keep fallback location when reverse geocoding is not available.
      }

      const current = weatherJson.current;
      if (!current) {
        throw new Error("No current weather payload");
      }

      setWeather({
        location: locationLabel,
        temperature: current.temperature_2m ?? 0,
        feelsLike: current.apparent_temperature ?? 0,
        humidity: current.relative_humidity_2m ?? 0,
        windSpeed: current.wind_speed_10m ?? 0,
        condition: getWeatherCondition(current.weather_code ?? -1),
        updatedAt: current.time ?? new Date().toISOString(),
      });
      setLastCoordinates({ latitude, longitude });
      setWeatherStatus("ready");
    } catch {
      setWeatherStatus("error");
      setWeatherError("Weather data unavailable right now.");
    }
  }, []);

  const loadWeatherFromIp = useCallback(async () => {
    try {
      const ipRes = await fetch("https://ipapi.co/json/");
      if (!ipRes.ok) {
        throw new Error("IP location API failed");
      }

      const ipJson = (await ipRes.json()) as {
        latitude?: number;
        longitude?: number;
        city?: string;
        region?: string;
        country_name?: string;
      };

      if (typeof ipJson.latitude !== "number" || typeof ipJson.longitude !== "number") {
        throw new Error("IP location coordinates unavailable");
      }

      const fallbackLocation = [ipJson.city, ipJson.region, ipJson.country_name]
        .filter(Boolean)
        .join(", ");

      await loadWeatherForCoordinates(ipJson.latitude, ipJson.longitude, fallbackLocation || "Approximate location");
    } catch {
      setWeatherStatus("error");
      setWeatherError("Unable to fetch weather. Allow location access or refresh.");
    }
  }, [loadWeatherForCoordinates]);

  const refreshWeather = useCallback(() => {
    if (!navigator.geolocation) {
      void loadWeatherFromIp();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void loadWeatherForCoordinates(position.coords.latitude, position.coords.longitude);
      },
      () => {
        void loadWeatherFromIp();
      },
      GEO_OPTIONS,
    );
  }, [loadWeatherForCoordinates, loadWeatherFromIp]);

  useEffect(() => {
    refreshWeather();
  }, [refreshWeather]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!lastCoordinates) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadWeatherForCoordinates(lastCoordinates.latitude, lastCoordinates.longitude, weather?.location);
    }, 5 * 60 * 1000);

    return () => window.clearInterval(timer);
  }, [lastCoordinates, loadWeatherForCoordinates, weather?.location]);

  const handleCreateRecruiter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");

    const email = form.email.trim().toLowerCase();
    const companyId = form.companyId.trim();
    const role = form.role;

    if (!companyId) {
      setNotice("Please select a company first.");
      return;
    }

    if (!email) {
      setNotice("Work email is required.");
      return;
    }

    setInviteLoading(true);

    try {
      await inviteCompanyMember(companyId, {
        email,
        role,
      });

      if (selectedCompany?.id && `${selectedCompany.id}` === companyId) {
        const refreshed = await getAdminCompany(companyId);
        setSelectedCompany(refreshed);
        await loadMembersForSelectedCompany(refreshed);
      }

      setForm((prev) => ({
        ...prev,
        email: "",
        role: "recruiter",
      }));
      setNotice(`Invitation sent to ${email}.`);
    } catch (err: unknown) {
      setNotice(getErrorMessage(err, "Could not send invitation right now."));
    } finally {
      setInviteLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate(ROUTES.auth.adminLogin, { replace: true });
  };

  const handleSectionNav = (event: MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    event.preventDefault();
    setActiveSection(sectionId);
    const section = document.getElementById(sectionId);
    if (!section) {
      return;
    }

    section.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${sectionId}`);
  };

  const toggleAiControl = (key: "autoScoring" | "strictFileValidation" | "anomalyAlerts") => {
    setAiControls((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <main className="admin-shell min-h-screen bg-gradient-to-br from-slate-100 via-teal-50 to-amber-50 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <ThemeToggle />
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <div className="ambient-grid" aria-hidden="true" />

      <section className="admin-layout grid gap-6 xl:grid-cols-[18rem,minmax(0,1fr)]">
        <aside className="admin-side-panel rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl" aria-label="Admin navigation">
          <div className="brand-lockup">
            <img src={atsIcon} alt="Apex ATS" className="brand-lockup-icon" />
            <div>
              <p className="brand-eyebrow">Apex ATS</p>
              <h1 className="brand-title">Admin Command</h1>
            </div>
          </div>

          <p className="role-chip-static">Signed in as: {currentRole || "admin"}</p>

          <nav className="menu-list">
            <a
              href="#overview"
              className={`menu-link ${activeSection === "overview" ? "active" : ""}`}
              aria-current={activeSection === "overview" ? "page" : undefined}
              onClick={(event) => handleSectionNav(event, "overview")}
            >
              Overview
            </a>
            <a
              href="#erp-core"
              className={`menu-link ${activeSection === "erp-core" ? "active" : ""}`}
              aria-current={activeSection === "erp-core" ? "page" : undefined}
              onClick={(event) => handleSectionNav(event, "erp-core")}
            >
              ERP Core
            </a>
            <a
              href="#ai-monitor"
              className={`menu-link ${activeSection === "ai-monitor" ? "active" : ""}`}
              aria-current={activeSection === "ai-monitor" ? "page" : undefined}
              onClick={(event) => handleSectionNav(event, "ai-monitor")}
            >
              AI Monitor
            </a>
            <a
              href="#charts"
              className={`menu-link ${activeSection === "charts" ? "active" : ""}`}
              aria-current={activeSection === "charts" ? "page" : undefined}
              onClick={(event) => handleSectionNav(event, "charts")}
            >
              Analytics
            </a>
            <a
              href="#company-verification"
              className={`menu-link ${activeSection === "company-verification" ? "active" : ""}`}
              aria-current={activeSection === "company-verification" ? "page" : undefined}
              onClick={(event) => handleSectionNav(event, "company-verification")}
            >
              Company Verification
            </a>
            <a
              href="#recruiter-management"
              className={`menu-link ${activeSection === "recruiter-management" ? "active" : ""}`}
              aria-current={activeSection === "recruiter-management" ? "page" : undefined}
              onClick={(event) => handleSectionNav(event, "recruiter-management")}
            >
              Recruiter Management
            </a>
            <a
              href="#pipeline-health"
              className={`menu-link ${activeSection === "pipeline-health" ? "active" : ""}`}
              aria-current={activeSection === "pipeline-health" ? "page" : undefined}
              onClick={(event) => handleSectionNav(event, "pipeline-health")}
            >
              Pipeline Health
            </a>
            <a
              href="#quick-actions"
              className={`menu-link ${activeSection === "quick-actions" ? "active" : ""}`}
              aria-current={activeSection === "quick-actions" ? "page" : undefined}
              onClick={(event) => handleSectionNav(event, "quick-actions")}
            >
              Quick Actions
            </a>
          </nav>

          <div className="side-actions">
            <Link to={ROUTES.auth.candidateLogin} className="side-link">Candidate Login</Link>
            <Link to={ROUTES.auth.recruiterLogin} className="side-link">Recruiter Login</Link>
            <button type="button" className="danger-btn" onClick={handleLogout}>
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </aside>

        <div className="admin-main space-y-6">
          <header className="admin-header tab-anchor rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl" id="overview">
            <div>
              <p className="header-kicker">Hiring Mission Control</p>
              <h2>{greetingLabel}, Admin</h2>
              <p>
                Manage recruiters, monitor hiring velocity, and drive the full talent funnel with
                live operational insights.
              </p>
            </div>
            <div className="header-right">
              <article className="weather-card" aria-live="polite">
                <div className="weather-head-row">
                  <div className="weather-head">
                    <CloudSun size={16} />
                    <span>Live Weather</span>
                  </div>
                  <button type="button" className="weather-refresh" onClick={refreshWeather}>
                    <RefreshCw size={13} /> Refresh
                  </button>
                </div>

                {weatherStatus === "loading" && <p className="weather-meta">Fetching weather...</p>}

                {weatherStatus === "error" && <p className="weather-meta">{weatherError}</p>}

                {weatherStatus === "ready" && weather && (
                  <>
                    <p className="weather-location"><MapPin size={13} /> {weather.location}</p>
                    <div className="weather-main-row">
                      <strong>{Math.round(weather.temperature)}°C</strong>
                      <span>{weather.condition}</span>
                    </div>
                    <p className="weather-meta">
                      Feels {Math.round(weather.feelsLike)}°C | Humidity {weather.humidity}% | Wind {Math.round(weather.windSpeed)} km/h
                    </p>
                    <p className="weather-meta weather-inline"><Clock3 size={12} /> Updated {new Date(weather.updatedAt).toLocaleTimeString()}</p>
                  </>
                )}
              </article>

              <p className="realtime-clock"><Clock3 size={13} /> {currentTime.toLocaleTimeString()}</p>

              <span className="date-badge">{new Date().toLocaleDateString()}</span>
            </div>
          </header>

          <section className="metric-grid grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Key hiring metrics ">
            {pipelineSummary.map((metric) => (
              <article className="metric-card rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/10" key={metric.label}>
                <p>{metric.label}</p>
                <h3>{metric.value}</h3>
                <span>{metric.trend}</span>
              </article>
            ))}
          </section>

          <section className="insight-strip grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl md:grid-cols-2 xl:grid-cols-4" aria-label="Operational KPI strip">
            <article>
              <BriefcaseBusiness size={18} />
              <div>
                <p>Fill Rate</p>
                <strong>74%</strong>
              </div>
            </article>
            <article>
              <Users size={18} />
              <div>
                <p>Active Recruiters</p>
                <strong>{activeRecruiterCount}</strong>
              </div>
            </article>
            <article>
              <Activity size={18} />
              <div>
                <p>Interview Success</p>
                <strong>39%</strong>
              </div>
            </article>
            <article>
              <Target size={18} />
              <div>
                <p>Offer Acceptance</p>
                <strong>82%</strong>
              </div>
            </article>
          </section>

          <section className="erp-grid tab-anchor grid gap-4 md:grid-cols-2" id="erp-core" aria-label="ERP core modules">
            {erpModules.map((module) => {
              const Icon = module.icon;
              return (
                <article className="panel erp-module-card rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-xl" key={module.title}>
                  <div className="erp-module-top">
                    <div className="erp-module-title">
                      <Icon size={16} />
                      <h3>{module.title}</h3>
                    </div>
                    <span className={`erp-status status-${module.status.toLowerCase()}`}>{module.status}</span>
                  </div>
                  <p className="erp-owner">Owner: {module.owner}</p>
                  <p className="erp-summary">{module.summary}</p>
                </article>
              );
            })}
          </section>

          <section className="owner-status-grid grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="System owner controls">
            {ownerStatus.map((item) => (
              <article className="panel owner-status-card rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-xl" key={item.label}>
                <p>{item.label}</p>
                <strong>{item.value}</strong>
                <span className={`erp-status status-${item.state.toLowerCase()}`}>{item.state}</span>
              </article>
            ))}
          </section>

          <section className="panel erp-queue-panel rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-xl" aria-label="ERP approvals queue">
            <div className="panel-header">
              <h3>Approvals Queue</h3>
              <span>Pending tasks across ERP workflows</span>
            </div>
            <div className="approval-list">
              {approvalQueue.map((item) => (
                <article key={item.task}>
                  <div>
                    <p>{item.task}</p>
                    <span>{item.by}</span>
                  </div>
                  <strong>{item.priority}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="ai-monitor-grid tab-anchor grid gap-4 xl:grid-cols-3" id="ai-monitor" aria-label="AI monitoring and control">
            <article className="panel ai-monitor-card rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-xl xl:col-span-2">
              <div className="panel-header">
                <h3><Bot size={16} /> AI Monitoring Center</h3>
                <span>ATS scoring and resume parsing control plane</span>
              </div>
              <div className="ai-metric-grid">
                {aiOpsMetrics.map((item) => (
                  <article key={item.label}>
                    <p>{item.label}</p>
                    <strong>{item.value}</strong>
                    <span className={`erp-status status-${item.status.toLowerCase()}`}>{item.status}</span>
                  </article>
                ))}
              </div>

              <div className="ai-controls">
                <button type="button" onClick={() => toggleAiControl("autoScoring")}>
                  Auto Scoring: {aiControls.autoScoring ? "ON" : "OFF"}
                </button>
                <button type="button" onClick={() => toggleAiControl("strictFileValidation")}>
                  Strict MIME/File Validation: {aiControls.strictFileValidation ? "ON" : "OFF"}
                </button>
                <button type="button" onClick={() => toggleAiControl("anomalyAlerts")}>
                  Anomaly Alerts: {aiControls.anomalyAlerts ? "ON" : "OFF"}
                </button>
              </div>
            </article>

            <article className="panel ai-score-card rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-xl">
              <div className="panel-header">
                <h3>ATS Score Distribution</h3>
                <span>Candidate quality by final score band (0.0-1.0)</span>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={atsScoreBands}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d8e4e7" />
                    <XAxis dataKey="band" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="candidates" fill="#0f766e" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="panel ai-feed-card rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-xl">
              <div className="panel-header">
                <h3>AI Event Feed</h3>
                <span>Recent scoring and parser engine events</span>
              </div>
              <div className="ai-event-list">
                {aiEventFeed.map((item) => (
                  <article key={`${item.time}-${item.event}`}>
                    <p>{item.event}</p>
                    <span>{item.time} | {item.detail}</span>
                    <strong className={`erp-status status-${item.severity.toLowerCase()}`}>{item.severity}</strong>
                  </article>
                ))}
              </div>
            </article>
          </section>

          <section className="panel rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-xl" aria-label="Role and access matrix">
            <div className="panel-header">
              <h3>Role Access Matrix</h3>
              <span>Mapped to system roles from backend policy</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Scope</th>
                    <th>Allowed Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roleAccessMatrix.map((item) => (
                    <tr key={item.role}>
                      <td>{item.role}</td>
                      <td>{item.scope}</td>
                      <td>{item.actions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="chart-grid tab-anchor grid gap-4 xl:grid-cols-3" id="charts">
            <article className="panel chart-panel rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-xl xl:col-span-2">
              <div className="panel-header">
                <h3>Hiring Velocity</h3>
                <span>Monthly trend: candidates, interviews, and offers</span>
              </div>
              <div className="chart-wrap large">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hiringVelocity}>
                    <defs>
                      <linearGradient id="candidateFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d8e4e7" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="candidates"
                      stroke="#0f766e"
                      fill="url(#candidateFill)"
                      strokeWidth={2.4}
                    />
                    <Line type="monotone" dataKey="interviews" stroke="#b45309" strokeWidth={2.2} />
                    <Line type="monotone" dataKey="offers" stroke="#2563eb" strokeWidth={2.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="panel chart-panel rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-xl">
              <div className="panel-header">
                <h3>Candidate Source Mix</h3>
                <span>Top channels driving candidate inflow</span>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={88}
                      dataKey="value"
                      nameKey="name"
                      paddingAngle={3}
                    >
                      {sourceDistribution.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={sourcePalette[sourceDistribution.findIndex((item) => item.name === entry.name)]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="panel chart-panel rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-xl">
              <div className="panel-header">
                <h3>Recruiter Output</h3>
                <span>Hires and interviews by recruiter</span>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recruiterOutput}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d8e4e7" />
                    <XAxis dataKey="recruiter" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="interviews" fill="#0f766e" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="hires" fill="#b45309" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

          <section className="panel-grid grid gap-4 xl:grid-cols-2">
            <article className="panel tab-anchor rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-xl" id="recruiter-management">
              <div className="panel-header">
                <h3>Invite Recruiter</h3>
                <span>Select company and role, then send invitation email</span>
              </div>

              <form className="recruiter-form" onSubmit={handleCreateRecruiter}>
                <label htmlFor="recruiter-company">Company Name</label>
                <select
                  id="recruiter-company"
                  value={form.companyId}
                  onChange={(event) => setForm((prev) => ({ ...prev, companyId: event.target.value }))}
                  required
                >
                  <option value="">Select company</option>
                  {availableCompanies.map((company) => (
                    <option key={String(company.id)} value={String(company.id)}>
                      {company.name || `Company ${company.id}`}
                    </option>
                  ))}
                </select>

                <label htmlFor="recruiter-email">Work Email</label>
                <input
                  id="recruiter-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="aarav@apexats.com"
                  required
                />

                <label htmlFor="recruiter-role">Role Name</label>
                <select
                  id="recruiter-role"
                  value={form.role}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      role: event.target.value as CompanyMemberRole,
                    }))
                  }
                >
                  <option value="admin">Admin</option>
                  <option value="hr">HR</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="interviewer">Interviewer</option>
                </select>

                <button type="submit" disabled={inviteLoading || availableCompanies.length === 0}>
                  {inviteLoading ? "Sending Invitation..." : "Send Invitation"}
                </button>
              </form>

              {notice && <p className="inline-notice">{notice}</p>}
            </article>

            <article className="panel tab-anchor rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-xl" id="pipeline-health">
              <div className="panel-header">
                <h3>Pipeline Health</h3>
                <span>Current priorities across the hiring funnel</span>
              </div>

              <ul className="focus-list">
                {hiringFocus.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>

              <div className="mini-kpi-grid">
                <article>
                  <CalendarClock size={15} />
                  <div>
                    <p>Avg. Time to Hire</p>
                    <strong>23 days</strong>
                  </div>
                </article>
                <article>
                  <CircleUserRound size={15} />
                  <div>
                    <p>Candidate NPS</p>
                    <strong>4.7 / 5</strong>
                  </div>
                </article>
              </div>
            </article>
          </section>

          <section className="panel tab-anchor company-verification-panel rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-xl" id="company-verification" aria-label="Company verification management">
            <div className="panel-header stack-mobile">
              <div>
                <h3><Building2 size={16} /> Company Verification Center</h3>
                <span>Manage verification state for recruiter companies via admin endpoints</span>
              </div>
              <div className="directory-actions company-filter-group">
                <button
                  type="button"
                  className={`secondary-action ${companyFilter === "all" ? "is-active" : ""}`}
                  onClick={() => setCompanyFilter("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`secondary-action ${companyFilter === "verified" ? "is-active" : ""}`}
                  onClick={() => setCompanyFilter("verified")}
                >
                  Verified
                </button>
                <button
                  type="button"
                  className={`secondary-action ${companyFilter === "pending" ? "is-active" : ""}`}
                  onClick={() => setCompanyFilter("pending")}
                >
                  Pending
                </button>
                <button type="button" className="secondary-action" onClick={() => void loadCompanies(companyFilter)}>
                  Refresh
                </button>
              </div>
            </div>

            {companiesError && <p className="inline-notice company-error">{companiesError}</p>}

            <div className="table-wrap company-table-wrap">
              <table className="company-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Company</th>
                    <th>Size</th>
                    <th>Email</th>
                    <th>Country</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companiesLoading ? (
                    <tr>
                      <td colSpan={7} className="table-empty-state">Loading companies...</td>
                    </tr>
                  ) : companies.length > 0 ? (
                    companies.map((company) => (
                      <tr key={String(company.id ?? company.email ?? company.name ?? "company") }>
                        <td>{company.id ?? "-"}</td>
                        <td>{company.name ?? "Unnamed company"}</td>
                        <td>{company.company_size ?? company.size ?? "-"}</td>
                        <td>{company.email ?? "-"}</td>
                        <td>{company.country ?? "-"}</td>
                        <td>
                          <span className={`status-pill ${company.is_verified ? "status-active" : "status-paused"}`}>
                            {company.is_verified ? "Verified" : "Pending"}
                          </span>
                        </td>
                        <td>
                          <div className="company-actions">
                            <button
                              type="button"
                              className="secondary-action company-view-btn"
                              onClick={() => company.id && handleViewCompany(company.id)}
                              disabled={!company.id || activeCompanyActionId === company.id}
                            >
                              View
                            </button>
                            {company.is_verified ? (
                              <button
                                type="button"
                                  className="secondary-action company-action-btn"
                                onClick={() => company.id && applyCompanyVerificationAction(company.id, "unverify")}
                                disabled={!company.id || activeCompanyActionId === company.id}
                              >
                                Unverify
                              </button>
                            ) : (
                              <button
                                type="button"
                                  className="secondary-action company-action-btn"
                                onClick={() => company.id && applyCompanyVerificationAction(company.id, "verify")}
                                disabled={!company.id || activeCompanyActionId === company.id}
                              >
                                Verify
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="table-empty-state">No companies found for the selected filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {selectedCompany && (
              <div className="company-detail-card">
                <div className="company-detail-hero">
                  <div>
                    <p className="company-detail-eyebrow">Company Profile</p>
                    <h3>{selectedCompany.name || "Unnamed company"}</h3>
                    <p className="company-detail-subtitle">
                      Professional verification view with complete business and contact information.
                    </p>
                  </div>
                  <div className="company-logo-hero">
                    {resolveLogoUrl(selectedCompany.logo) ? (
                      <img src={resolveLogoUrl(selectedCompany.logo)} alt={`${selectedCompany.name || "Company"} logo`} className="company-logo-image" />
                    ) : (
                      <div className="company-logo-fallback">
                        {(selectedCompany.name || "C").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="company-detail-hero-actions">
                    <span className={`status-pill ${selectedCompany.is_verified ? "status-active" : "status-paused"}`}>
                      {selectedCompany.is_verified ? "Verified" : "Pending Review"}
                    </span>
                    {selectedCompany.is_verified ? (
                      <button
                        type="button"
                        className="secondary-action"
                        onClick={() => selectedCompany.id && applyCompanyVerificationAction(selectedCompany.id, "unverify")}
                        disabled={!selectedCompany.id || activeCompanyActionId === selectedCompany.id}
                      >
                        Mark Pending
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="secondary-action"
                        onClick={() => selectedCompany.id && applyCompanyVerificationAction(selectedCompany.id, "verify")}
                        disabled={!selectedCompany.id || activeCompanyActionId === selectedCompany.id}
                      >
                        Verify Company
                      </button>
                    )}
                  </div>
                </div>

                <div className="company-detail-layout">
                  <section className="company-detail-section">
                    <h4>Business Information</h4>
                    <div className="company-detail-grid">
                      <article>
                        <p>Industry</p>
                        <strong>{toDisplay(selectedCompany.industry)}</strong>
                      </article>
                      <article>
                        <p>Company Size</p>
                        <strong>{toDisplay(selectedCompany.company_size ?? selectedCompany.size)}</strong>
                      </article>
                      <article>
                        <p>Website</p>
                        <strong>{toDisplay(selectedCompany.website)}</strong>
                      </article>
                    </div>
                    <article className="company-detail-wide">
                      <p>Description</p>
                      <strong>{toDisplay(selectedCompany.description)}</strong>
                    </article>
                  </section>

                  <section className="company-detail-section">
                    <h4>Company Contact</h4>
                    <div className="company-detail-grid">
                      <article>
                        <p>Official Email</p>
                        <strong>{toDisplay(selectedCompany.email)}</strong>
                      </article>
                      <article>
                        <p>Official Phone</p>
                        <strong>{toDisplay(selectedCompany.phone)}</strong>
                      </article>
                      <article>
                        <p>Verification Status</p>
                        <strong>{selectedCompany.is_verified ? "Verified" : "Pending"}</strong>
                      </article>
                    </div>
                  </section>

                  <section className="company-detail-section">
                    <h4>Recruiter Liaison</h4>
                    <div className="company-detail-grid">
                      <article>
                        <p>Contact Person</p>
                        <strong>{toDisplay(selectedCompany.contact_person_name)}</strong>
                      </article>
                      <article>
                        <p>Designation</p>
                        <strong>{toDisplay(selectedCompany.contact_person_designation)}</strong>
                      </article>
                      <article>
                        <p>Contact Email</p>
                        <strong>{toDisplay(selectedCompany.contact_person_email)}</strong>
                      </article>
                      <article>
                        <p>Contact Phone</p>
                        <strong>{toDisplay(selectedCompany.contact_person_phone)}</strong>
                      </article>
                    </div>
                  </section>

                  <section className="company-detail-section">
                    <h4>Address & Location</h4>
                    <div className="company-detail-grid">
                      <article>
                        <p>Registered Address</p>
                        <strong>{formatCompanyAddress(selectedCompany)}</strong>
                      </article>
                      <article>
                        <p>Geo Coordinates</p>
                        <strong>{formatCompanyGeo(selectedCompany)}</strong>
                      </article>
                      <article>
                        <p>Area</p>
                        <strong>{toDisplay([selectedCompany.city, selectedCompany.country].filter(Boolean).join(", "))}</strong>
                      </article>
                    </div>
                  </section>

                  <section className="company-detail-section company-members-section">
                    <h4>Recruiter Details</h4>

                    {selectedCompanyMembersError && <p className="inline-notice company-error">{selectedCompanyMembersError}</p>}

                    {selectedCompanyMembersLoading ? (
                      <article className="company-detail-wide">
                        <p>Recruiter Details</p>
                        <strong>Loading member list...</strong>
                      </article>
                    ) : companyMembersForAdmin.length > 0 ? (
                      <div className="table-wrap company-members-table-wrap">
                        <table className="company-members-table">
                          <thead>
                            <tr>
                              <th>Profile</th>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Role</th>
                              <th>Status</th>
                              <th>Company</th>
                              <th>Created</th>
                            </tr>
                          </thead>
                          <tbody>
                            {companyMembersForAdmin.map((member) => {
                              const details = getApprovedMemberDetails(member);
                              const profileImageUrl = resolveProfileImageUrl(details.profileImage);

                              return (
                                <tr key={member.id}>
                                  <td>
                                    {profileImageUrl ? (
                                      <img
                                        src={profileImageUrl}
                                        alt={details.displayName}
                                        className="member-profile-thumb"
                                      />
                                    ) : (
                                      <div className="member-profile-fallback" title={details.displayName}>
                                        <CircleUserRound size={14} />
                                      </div>
                                    )}
                                  </td>
                                  <td>{toDisplay(details.displayName)}</td>
                                  <td>{toDisplay(details.email)}</td>
                                  <td>{toDisplay(details.role)}</td>
                                  <td>
                                    <span className={`status-pill ${details.isApproved ? "status-active" : "status-paused"}`}>
                                      {toDisplay(details.statusLabel)}
                                    </span>
                                  </td>
                                  <td>{toDisplay(selectedCompany.name)}</td>
                                  <td>{formatCreatedDate(details.createdAt)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <article className="company-detail-wide">
                        <p>Recruiter Details</p>
                        <strong>No approved members in this company yet.</strong>
                      </article>
                    )}
                  </section>
                </div>
              </div>
            )}
          </section>

          <section className="panel tab-anchor rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-xl" id="quick-actions">
            <div className="panel-header">
              <h3>Quick Actions</h3>
              <span>Common admin tasks for hiring operations</span>
            </div>
            <div className="action-grid">
              <button type="button"><UserPlus size={14} /> Create Recruiter Seat</button>
              <button type="button"><BriefcaseBusiness size={14} /> Create New Job Opening</button>
              <button type="button"><CalendarClock size={14} /> Schedule Interview Panel</button>
              <button type="button"><Activity size={14} /> Export Hiring Report</button>
            </div>
          </section>
        </div>
      </section>

      {showBackToTop && (
        <button
          type="button"
          className="back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <ArrowUp size={14} /> Back to top
        </button>
      )}
    </main>
  );
}
