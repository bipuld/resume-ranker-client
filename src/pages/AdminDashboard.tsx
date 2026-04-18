import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowUp,
  Bot,
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
import { ROUTES } from "../routes/paths";
import { clearAuthSession, getAuthRole } from "../utils/authSession";
import "./AdminDashboard.css";

type RecruiterStatus = "Invited" | "Active" | "Paused";

type Recruiter = {
  id: string;
  fullName: string;
  email: string;
  team: string;
  status: RecruiterStatus;
  createdAt: string;
};

const seedRecruiters: Recruiter[] = [
  {
    id: "REC-001",
    fullName: "Anita Sharma",
    email: "anita.sharma@apexats.com",
    team: "Engineering",
    status: "Active",
    createdAt: "2026-04-12",
  },
  {
    id: "REC-002",
    fullName: "Rohan Singh",
    email: "rohan.singh@apexats.com",
    team: "Sales",
    status: "Invited",
    createdAt: "2026-04-15",
  },
  {
    id: "REC-003",
    fullName: "Mina Gurung",
    email: "mina.gurung@apexats.com",
    team: "Operations",
    status: "Paused",
    createdAt: "2026-04-17",
  },
];

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
const RECRUITER_STORAGE_KEY = "ats.admin.recruiters";
const SECTION_IDS = [
  "overview",
  "erp-core",
  "ai-monitor",
  "charts",
  "recruiter-management",
  "pipeline-health",
  "quick-actions",
] as const;

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
  const [recruiters, setRecruiters] = useState<Recruiter[]>(() => {
    try {
      const raw = localStorage.getItem(RECRUITER_STORAGE_KEY);
      if (!raw) {
        return seedRecruiters;
      }

      const parsed = JSON.parse(raw) as Recruiter[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return seedRecruiters;
      }

      return parsed;
    } catch {
      return seedRecruiters;
    }
  });
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    team: "Engineering",
    status: "Invited" as RecruiterStatus,
  });
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [weatherStatus, setWeatherStatus] = useState<"loading" | "ready" | "error">("loading");
  const [weatherError, setWeatherError] = useState("");
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [lastCoordinates, setLastCoordinates] = useState<Coordinates | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
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

  const filteredRecruiters = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return recruiters;
    }

    return recruiters.filter((item) => {
      return (
        item.fullName.toLowerCase().includes(normalized) ||
        item.email.toLowerCase().includes(normalized) ||
        item.team.toLowerCase().includes(normalized) ||
        item.status.toLowerCase().includes(normalized)
      );
    });
  }, [query, recruiters]);

  useEffect(() => {
    localStorage.setItem(RECRUITER_STORAGE_KEY, JSON.stringify(recruiters));
  }, [recruiters]);

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

  const handleCreateRecruiter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");

    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();

    if (!fullName || !email) {
      setNotice("Recruiter name and email are required.");
      return;
    }

    const exists = recruiters.some((item) => item.email.toLowerCase() === email);
    if (exists) {
      setNotice("A recruiter with this email already exists.");
      return;
    }

    const nextId = `REC-${String(recruiters.length + 1).padStart(3, "0")}`;
    const nextRecruiter: Recruiter = {
      id: nextId,
      fullName,
      email,
      team: form.team,
      status: form.status,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setRecruiters((prev) => [nextRecruiter, ...prev]);
    setForm({
      fullName: "",
      email: "",
      team: form.team,
      status: "Invited",
    });
    setNotice(`Recruiter ${fullName} created successfully.`);
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

  const handleExportRecruiters = () => {
    if (filteredRecruiters.length === 0) {
      setNotice("No recruiter records available for export.");
      return;
    }

    const headers = ["id", "fullName", "email", "team", "status", "createdAt"];
    const rows = filteredRecruiters.map((item) => [
      item.id,
      item.fullName,
      item.email,
      item.team,
      item.status,
      item.createdAt,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const safe = String(cell).replace(/"/g, '""');
            return `"${safe}"`;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `recruiters-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setNotice("Recruiter data exported successfully.");
  };

  const toggleAiControl = (key: "autoScoring" | "strictFileValidation" | "anomalyAlerts") => {
    setAiControls((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <main className="admin-shell">
      <ThemeToggle />
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <div className="ambient-grid" aria-hidden="true" />

      <section className="admin-layout">
        <aside className="admin-side-panel" aria-label="Admin navigation">
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

        <div className="admin-main">
          <header className="admin-header tab-anchor" id="overview">
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

          <section className="metric-grid" aria-label="Key hiring metrics ">
            {pipelineSummary.map((metric) => (
              <article className="metric-card" key={metric.label}>
                <p>{metric.label}</p>
                <h3>{metric.value}</h3>
                <span>{metric.trend}</span>
              </article>
            ))}
          </section>

          <section className="insight-strip" aria-label="Operational KPI strip">
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
                <strong>{recruiters.filter((item) => item.status === "Active").length}</strong>
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

          <section className="erp-grid tab-anchor" id="erp-core" aria-label="ERP core modules">
            {erpModules.map((module) => {
              const Icon = module.icon;
              return (
                <article className="panel erp-module-card" key={module.title}>
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

          <section className="owner-status-grid" aria-label="System owner controls">
            {ownerStatus.map((item) => (
              <article className="panel owner-status-card" key={item.label}>
                <p>{item.label}</p>
                <strong>{item.value}</strong>
                <span className={`erp-status status-${item.state.toLowerCase()}`}>{item.state}</span>
              </article>
            ))}
          </section>

          <section className="panel erp-queue-panel" aria-label="ERP approvals queue">
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

          <section className="ai-monitor-grid tab-anchor" id="ai-monitor" aria-label="AI monitoring and control">
            <article className="panel ai-monitor-card">
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

            <article className="panel ai-score-card">
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

            <article className="panel ai-feed-card">
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

          <section className="panel" aria-label="Role and access matrix">
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

          <section className="chart-grid tab-anchor" id="charts">
            <article className="panel chart-panel">
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

            <article className="panel chart-panel">
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

            <article className="panel chart-panel">
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

          <section className="panel-grid">
            <article className="panel tab-anchor" id="recruiter-management">
              <div className="panel-header">
                <h3>Create Recruiter</h3>
                <span>Invite and assign hiring ownership</span>
              </div>

              <form className="recruiter-form" onSubmit={handleCreateRecruiter}>
                <label htmlFor="recruiter-fullName">Full Name</label>
                <input
                  id="recruiter-fullName"
                  type="text"
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  placeholder="Aarav Basnet"
                  required
                />

                <label htmlFor="recruiter-email">Work Email</label>
                <input
                  id="recruiter-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="aarav@apexats.com"
                  required
                />

                <div className="form-two">
                  <div>
                    <label htmlFor="recruiter-team">Team</label>
                    <select
                      id="recruiter-team"
                      value={form.team}
                      onChange={(event) => setForm((prev) => ({ ...prev, team: event.target.value }))}
                    >
                      <option>Engineering</option>
                      <option>Sales</option>
                      <option>Operations</option>
                      <option>Design</option>
                      <option>Finance</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="recruiter-status">Status</label>
                    <select
                      id="recruiter-status"
                      value={form.status}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, status: event.target.value as RecruiterStatus }))
                      }
                    >
                      <option value="Invited">Invited</option>
                      <option value="Active">Active</option>
                      <option value="Paused">Paused</option>
                    </select>
                  </div>
                </div>

                <button type="submit">Create Recruiter</button>
              </form>

              {notice && <p className="inline-notice">{notice}</p>}
            </article>

            <article className="panel tab-anchor" id="pipeline-health">
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

          <section className="panel" aria-label="Recruiter directory">
            <div className="panel-header stack-mobile">
              <div>
                <h3>Recruiter Directory</h3>
                <span>Search, review, and monitor recruiter status</span>
              </div>
              <div className="directory-actions">
                <input
                  type="search"
                  placeholder="Search recruiter, team, status"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search recruiters"
                />
                <button type="button" className="secondary-action" onClick={handleExportRecruiters}>
                  Export CSV
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Team</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecruiters.length > 0 ? (
                    filteredRecruiters.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.fullName}</td>
                        <td>{item.email}</td>
                        <td>{item.team}</td>
                        <td>
                          <span className={`status-pill status-${item.status.toLowerCase()}`}>{item.status}</span>
                        </td>
                        <td>{item.createdAt}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="table-empty-state">No recruiters found for current search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel tab-anchor" id="quick-actions">
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
