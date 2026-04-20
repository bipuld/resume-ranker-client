import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BarChart3,
  Clock,
  AtSign,
  LogOut,
  MessageSquare,
  Plus,
  RefreshCw,
  Settings,
  UserCircle2,
  Users,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import {
  getCompanyMembershipDetails,
  getCompanyMembers,
  getCompanyStatus,
  inviteCompanyMember,
  updateCompanyMemberRole,
} from "../api/company";
import { getRecruiterNotifications } from "../api/notifications";
import { getProfile } from "../api/profile";
import { ROUTES } from "../routes/paths";
import { clearAuthSession } from "../utils/authSession";
import ThemeToggle from "../components/ThemeToggle";
import type { RecruiterNotification } from "../types/notifications";
import type {
  CompanyMember,
  CompanyMemberPermissions,
  CompanyMemberRole,
} from "../types/company";

type CompanyInfo = {
  id?: string | number;
  name?: string;
  is_verified?: boolean;
  website?: string;
  industry?: string;
  company_size?: string;
  description?: string;
};

type RecruiterIdentity = {
  displayName: string;
  profileImage: string;
  email: string;
  userId: string;
};

type InviteMemberState = {
  email: string;
  role: "admin" | "hr" | "recruiter" | "interviewer";
};

const DEFAULT_MEMBER_PERMISSIONS: CompanyMemberPermissions = {
  can_post_jobs: true,
  can_edit_jobs: false,
  can_delete_jobs: false,
  can_view_applicants: true,
  can_shortlist_candidates: true,
  can_manage_team: false,
};

const permissionFields: Array<{ key: keyof CompanyMemberPermissions; label: string }> = [
  { key: "can_post_jobs", label: "Post jobs" },
  { key: "can_edit_jobs", label: "Edit jobs" },
  { key: "can_delete_jobs", label: "Delete jobs" },
  { key: "can_view_applicants", label: "View applicants" },
  { key: "can_shortlist_candidates", label: "Shortlist candidates" },
  { key: "can_manage_team", label: "Manage team" },
];

const editableRoles: CompanyMemberRole[] = ["hr", "recruiter", "interviewer"];

const roleTitleByCode: Record<CompanyMemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  hr: "HR",
  recruiter: "Recruiter",
  interviewer: "Interviewer",
};

const normalizeEmail = (value?: string) => (value || "").trim().toLowerCase();

const getMemberCompanyId = (member: CompanyMember) => {
  const value = member.company;
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return `${value}`;
  }

  if (typeof value === "object" && value !== null && "id" in value) {
    const id = (value as { id?: string | number }).id;
    return id === undefined || id === null ? "" : `${id}`;
  }

  return "";
};

const getMemberUserId = (member: CompanyMember) => {
  const value = member.user;
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return `${value}`;
  }

  if (typeof value === "object" && value !== null && "id" in value) {
    const id = (value as { id?: string | number }).id;
    return id === undefined || id === null ? "" : `${id}`;
  }

  return "";
};

const withMemberPermissionDefaults = (member: CompanyMember): CompanyMember => {
  const normalizedRole = `${member.role || "recruiter"}`.toLowerCase();
  const role: CompanyMemberRole =
    normalizedRole === "owner" ||
    normalizedRole === "admin" ||
    normalizedRole === "hr" ||
    normalizedRole === "recruiter" ||
    normalizedRole === "interviewer"
      ? (normalizedRole as CompanyMemberRole)
      : "recruiter";

  return {
    ...member,
    role,
    can_post_jobs:
      typeof member.can_post_jobs === "boolean"
        ? member.can_post_jobs
        : DEFAULT_MEMBER_PERMISSIONS.can_post_jobs,
    can_edit_jobs:
      typeof member.can_edit_jobs === "boolean"
        ? member.can_edit_jobs
        : DEFAULT_MEMBER_PERMISSIONS.can_edit_jobs,
    can_delete_jobs:
      typeof member.can_delete_jobs === "boolean"
        ? member.can_delete_jobs
        : DEFAULT_MEMBER_PERMISSIONS.can_delete_jobs,
    can_view_applicants:
      typeof member.can_view_applicants === "boolean"
        ? member.can_view_applicants
        : DEFAULT_MEMBER_PERMISSIONS.can_view_applicants,
    can_shortlist_candidates:
      typeof member.can_shortlist_candidates === "boolean"
        ? member.can_shortlist_candidates
        : DEFAULT_MEMBER_PERMISSIONS.can_shortlist_candidates,
    can_manage_team:
      typeof member.can_manage_team === "boolean"
        ? member.can_manage_team
        : DEFAULT_MEMBER_PERMISSIONS.can_manage_team,
  };
};

const workflowCards = [
  {
    icon: Plus,
    title: "Create Job",
    desc: "Post new open positions and attract top talent.",
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600",
  },
  {
    icon: Users,
    title: "Manage Applicants",
    desc: "Review candidate pipeline and shortlist profiles.",
    color: "from-blue-500 to-cyan-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/30",
    iconColor: "text-blue-600",
  },
  {
    icon: Clock,
    title: "Schedule Interviews",
    desc: "Coordinate interviews and sync calendars.",
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-50 dark:bg-amber-900/30",
    iconColor: "text-amber-600",
  },
];

const recentActivity = [
  { time: "2 hours ago", action: "Company verified and approved", status: "success" },
  { time: "1 day ago", action: "Company profile submitted for approval", status: "info" },
  { time: "1 day ago", action: "Account created successfully", status: "success" },
];

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const alertsRef = useRef<HTMLDivElement | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [identity, setIdentity] = useState<RecruiterIdentity>({
    displayName: "Recruiter",
    profileImage: "",
    email: "",
    userId: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState<RecruiterNotification[]>([]);
  const [alertsError, setAlertsError] = useState("");
  const [inviteMember, setInviteMember] = useState<InviteMemberState>({
    email: "",
    role: "recruiter",
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [memberUpdateMessage, setMemberUpdateMessage] = useState("");
  const [memberUpdateError, setMemberUpdateError] = useState("");
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [isCompanyOwner, setIsCompanyOwner] = useState(false);
  const [currentMembershipRole, setCurrentMembershipRole] = useState<CompanyMemberRole | null>(null);
  const [stats, setStats] = useState({
    openJobs: 0,
    totalApplications: 0,
    interviewsScheduled: 0,
    offersExtended: 0,
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  const loadCompanyInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getCompanyStatus();
      const companyData = (res as any)?.company || res;
      setCompany(companyData as CompanyInfo);
      
      setStats({
        openJobs: Math.floor(Math.random() * 8) + 1,
        totalApplications: Math.floor(Math.random() * 50) + 10,
        interviewsScheduled: Math.floor(Math.random() * 15) + 2,
        offersExtended: Math.floor(Math.random() * 5) + 1,
      });
    } catch (err) {
      console.error("Failed to load company info:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCompanyMembers = useCallback(async (companyId: string | number) => {
    setMembersLoading(true);
    setMembersError("");

    try {
      const items = await getCompanyMembers(companyId);
      setMembers(items.map(withMemberPermissionDefaults));
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string; detail?: string } } })?.response?.data
          ?.message ||
        (err as { response?: { data?: { message?: string; detail?: string } } })?.response?.data
          ?.detail ||
        "Could not load members right now.";
      setMembersError(message);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const loadCurrentMembership = useCallback(async (companyId: string | number, companyName?: string) => {
    try {
      const memberships = await getCompanyMembershipDetails();
      const targetCompanyId = `${companyId}`;
      const targetCompanyName = (companyName || "").trim().toLowerCase();

      const currentMembership = memberships.find((membership) => {
        if (membership.is_active === false) {
          return false;
        }

        const membershipCompanyId = getMemberCompanyId(membership);
        const membershipCompanyName =
          typeof membership.company === "object" && membership.company !== null && "name" in membership.company
            ? `${(membership.company as { name?: string }).name || ""}`.trim().toLowerCase()
            : "";

        if (membershipCompanyId && membershipCompanyId === targetCompanyId) {
          return true;
        }

        if (targetCompanyName && membershipCompanyName && membershipCompanyName === targetCompanyName) {
          return true;
        }

        return false;
      });

      const selectedMembership = currentMembership || (memberships.length === 1 ? memberships[0] : undefined);

      const currentRole = selectedMembership?.role;
      setCurrentMembershipRole(
        currentRole === "owner" ||
          currentRole === "admin" ||
          currentRole === "hr" ||
          currentRole === "recruiter" ||
          currentRole === "interviewer"
          ? currentRole
          : null,
      );

      const isOwner = Boolean(selectedMembership?.is_owner) || currentRole === "owner";
      setIsCompanyOwner(isOwner);
    } catch {
      setIsCompanyOwner(false);
      setCurrentMembershipRole(null);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const profile = await getProfile();
      const profileUser =
        typeof profile.user === "object" && profile.user !== null ? profile.user : undefined;
      const fullName =
        profile.full_name ||
        [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(" ").trim() ||
        profile.email ||
        "Recruiter";

      const profileImage = (() => {
        if (!profile.profile_image) return "";
        if (/^https?:\/\//i.test(profile.profile_image)) return profile.profile_image;
        const apiBase = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1/").replace(/\/?api\/v1\/?$/, "");
        return `${apiBase}${profile.profile_image.startsWith("/") ? "" : "/"}${profile.profile_image}`;
      })();

      setIdentity({
        displayName: fullName,
        profileImage,
        email: normalizeEmail(profileUser?.email || profile.email),
        userId: `${profileUser?.id ?? profile.id ?? ""}`,
      });
    } catch {
      // Keep dashboard usable with fallback identity if profile lookup fails.
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const items = await getRecruiterNotifications();
      setAlertsError("");
      setAlerts(items);
    } catch {
      setAlertsError("Could not fetch notifications right now.");
    }
  }, []);

  useEffect(() => {
    loadCompanyInfo();
  }, [loadCompanyInfo]);

  useEffect(() => {
    if (!company?.id) {
      return;
    }

    loadCompanyMembers(company.id);
    loadCurrentMembership(company.id, company.name);
  }, [company?.id, loadCompanyMembers, loadCurrentMembership]);

  useEffect(() => {
    if (currentMembershipRole || members.length === 0) {
      return;
    }

    const currentMember = members.find((member) => {
      const memberEmail = normalizeEmail(member.email || member.invite_email);
      const memberUserId = getMemberUserId(member);
      return (
        (identity.email && memberEmail && identity.email === memberEmail) ||
        (identity.userId && memberUserId && identity.userId === memberUserId)
      );
    });

    if (!currentMember) {
      return;
    }

    const role = currentMember.role;
    if (
      role === "owner" ||
      role === "admin" ||
      role === "hr" ||
      role === "recruiter" ||
      role === "interviewer"
    ) {
      setCurrentMembershipRole(role);
      setIsCompanyOwner(role === "owner");
    }
  }, [currentMembershipRole, members, identity.email, identity.userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!alertsRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !alertsRef.current.contains(target)) {
        setAlertsOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, [currentTime]);

  const teamMembersExcludingSelf = useMemo(() => {
    const withoutSelf = members.filter((member) => {
      const memberEmail = normalizeEmail(member.email || member.invite_email);
      const memberUserId = getMemberUserId(member);

      const sameEmail = Boolean(identity.email && memberEmail && identity.email === memberEmail);
      const sameUserId = Boolean(identity.userId && memberUserId && identity.userId === memberUserId);

      return !sameEmail && !sameUserId;
    });

    if (isCompanyOwner) {
      return withoutSelf;
    }

    return withoutSelf.filter((member) => member.is_approved === true);
  }, [members, identity.email, identity.userId, isCompanyOwner]);

  const approvedTeamMembers = useMemo(
    () => teamMembersExcludingSelf.filter((member) => member.is_approved === true),
    [teamMembersExcludingSelf],
  );

  const pendingApprovalMembers = useMemo(() => {
    if (!isCompanyOwner) {
      return [];
    }

    return teamMembersExcludingSelf.filter((member) => member.is_approved !== true);
  }, [teamMembersExcludingSelf, isCompanyOwner]);

  const handleLogout = () => {
    clearAuthSession();
    navigate(ROUTES.auth.login, { replace: true });
  };

  const handleInviteMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInviteError("");
    setInviteMessage("");

    if (!company?.id) {
      setInviteError("Company information is not loaded yet.");
      return;
    }

    const email = inviteMember.email.trim().toLowerCase();
    if (!email) {
      setInviteError("Please enter a member email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError("Enter a valid email address.");
      return;
    }

    setInviteLoading(true);
    try {
      const res = await inviteCompanyMember(company.id, {
        email,
        role: inviteMember.role,
      });

      setInviteMember({ email: "", role: "recruiter" });
      setInviteMessage(res.message || `Invite sent to ${email}.`);
      await loadCompanyMembers(company.id);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string; detail?: string } } })?.response?.data
          ?.message ||
        (err as { response?: { data?: { message?: string; detail?: string } } })?.response?.data
          ?.detail ||
        "Could not send invite right now.";
      setInviteError(message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleMemberRoleChange = (memberId: string, nextRole: CompanyMemberRole) => {
    setMembers((prev) =>
      prev.map((member) => (`${member.id}` === memberId ? { ...member, role: nextRole } : member)),
    );
  };

  const handleMemberPermissionToggle = (
    memberId: string,
    key: keyof CompanyMemberPermissions,
    checked: boolean,
  ) => {
    setMembers((prev) =>
      prev.map((member) =>
        `${member.id}` === memberId
          ? {
              ...member,
              [key]: checked,
            }
          : member,
      ),
    );
  };

  const handleSaveMemberAccess = async (member: CompanyMember) => {
    const memberId = `${member.id}`;

    if (!isCompanyOwner) {
      setMemberUpdateError("Only company owner can update member access.");
      return;
    }

    if (!member.is_approved) {
      setMemberUpdateError("You can edit permissions only after member approval.");
      return;
    }

    if (member.role === "owner") {
      setMemberUpdateError("Owner access cannot be edited from this panel.");
      return;
    }

    setSavingMemberId(memberId);
    setMemberUpdateMessage("");
    setMemberUpdateError("");

    try {
      const updated = await updateCompanyMemberRole(member.id, {
        role: member.role,
        can_post_jobs: Boolean(member.can_post_jobs),
        can_edit_jobs: Boolean(member.can_edit_jobs),
        can_delete_jobs: Boolean(member.can_delete_jobs),
        can_view_applicants: Boolean(member.can_view_applicants),
        can_shortlist_candidates: Boolean(member.can_shortlist_candidates),
        can_manage_team: Boolean(member.can_manage_team),
      });

      setMembers((prev) =>
        prev.map((item) =>
          `${item.id}` === `${member.id}` ? withMemberPermissionDefaults(updated) : item,
        ),
      );
      setMemberUpdateMessage(`Updated access for ${member.invite_email || member.email || "member"}.`);
    } catch (err) {
      const errorData = (err as { response?: { data?: unknown } })?.response?.data;
      const message =
        (errorData as { message?: string })?.message ||
        (errorData as { detail?: string })?.detail ||
        (typeof errorData === "object" && errorData
          ? Object.entries(errorData as Record<string, unknown>)
              .map(([key, value]) => {
                if (Array.isArray(value)) {
                  return `${key}: ${value.join(", ")}`;
                }
                if (typeof value === "string") {
                  return `${key}: ${value}`;
                }
                return "";
              })
              .filter(Boolean)
              .join(" | ")
          : "") ||
        "Could not update member access right now.";
      setMemberUpdateError(message);
    } finally {
      setSavingMemberId(null);
    }
  };

  const fallbackAlerts = useMemo<RecruiterNotification[]>(() => {
    const verificationAlert = company?.is_verified
      ? {
          id: "company-approved",
          title: "Company verified by admin",
          detail: `${company?.name || "Your company"} is approved. You can continue hiring without restrictions.`,
          created_at: "2h ago",
          severity: "success" as const,
        }
      : {
          id: "company-review",
          title: "Company review is pending",
          detail: "Admin team is reviewing your company profile. You can update details anytime.",
          created_at: "Now",
          severity: "info" as const,
        };

    return [
      {
        id: "admin-guideline",
        title: "New admin guideline",
        detail: "Please keep company contact information accurate for faster candidate communication.",
        created_at: "Today",
        severity: "info" as const,
      },
      verificationAlert,
    ];
  }, [company?.is_verified, company?.name]);

  const activeAlerts = alerts.length > 0 ? alerts : fallbackAlerts;
  const membershipRoleTitle = currentMembershipRole ? roleTitleByCode[currentMembershipRole] : "Member";

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-cyan-50 to-blue-100 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <ThemeToggle compact />
      {/* Animated background gradients */}
      <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-cyan-500/20 opacity-30 blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-500/20 opacity-30 blur-3xl animate-pulse"></div>
      
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-500 bg-clip-text text-transparent mb-2">
                  {greeting}, {membershipRoleTitle}
                </h1>
                <p className="text-slate-700 dark:text-slate-400 text-lg">
                  {company?.name ? `Manage hiring for ${company.name}` : "Welcome back to your workspace"}
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative" ref={alertsRef}>
                  <button
                    onClick={() => setAlertsOpen((prev) => !prev)}
                    className="relative p-3 rounded-xl bg-white/70 border border-slate-200 text-slate-700 hover:bg-white transition-all duration-200 backdrop-blur-sm dark:bg-white/10 dark:border-white/20 dark:text-slate-200 dark:hover:bg-white/20"
                    title="Inbox"
                    aria-label="Open inbox alerts"
                  >
                    <Bell size={20} />
                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
                      {activeAlerts.length}
                    </span>
                  </button>

                  {alertsOpen && (
                    <div className="absolute right-0 z-20 mt-3 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                        Inbox Alerts
                      </p>
                      {alertsError && (
                        <p className="mb-2 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                          {alertsError}
                        </p>
                      )}
                      <div className="space-y-2">
                        {activeAlerts.map((alert) => (
                          <div key={alert.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{alert.title}</p>
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{alert.detail}</p>
                            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{alert.created_at || "Recent"}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={loadNotifications}
                        className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                      >
                        Refresh inbox
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => navigate(ROUTES.recruiter.profile)}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 transition hover:bg-white dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/20"
                  title="Recruiter profile"
                >
                  {identity.profileImage ? (
                    <img
                      src={identity.profileImage}
                      alt="Recruiter profile"
                      className="h-10 w-10 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                    />
                  ) : (
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300">
                      <UserCircle2 size={20} />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{identity.displayName}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{membershipRoleTitle}</p>
                  </div>
                </button>

                <button 
                  onClick={loadCompanyInfo}
                  disabled={isLoading}
                  className="p-3 rounded-xl bg-white/70 border border-slate-200 text-cyan-700 hover:bg-white transition-all duration-200 backdrop-blur-sm disabled:opacity-50 dark:bg-white/10 dark:border-white/20 dark:text-cyan-400 dark:hover:bg-white/20"
                  title="Refresh"
                >
                  <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                </button>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 font-medium flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <LogOut size={18} />
                  Sign out
                </button>
              </div>
            </div>
          </div>

          {/* Company Info Card */}
          {company && (
            <div className="mb-8 p-6 rounded-2xl bg-white/75 border border-slate-200 backdrop-blur-xl shadow-xl hover:bg-white transition-all duration-300 dark:bg-white/5 dark:border-white/10 dark:shadow-2xl dark:hover:bg-white/[0.08]">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{company.name || "Your Company"}</h2>
                  <div className="flex flex-wrap gap-2">
                    {company.industry && (
                      <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-300 text-cyan-800 text-sm font-medium dark:bg-cyan-500/20 dark:border-cyan-400/30 dark:text-cyan-300">
                        {company.industry}
                      </span>
                    )}
                    {company.company_size && (
                      <span className="px-3 py-1 rounded-full bg-blue-500/15 border border-blue-300 text-blue-800 text-sm font-medium dark:bg-blue-500/20 dark:border-blue-400/30 dark:text-blue-300">
                        {company.company_size} employees
                      </span>
                    )}
                    {company.is_verified ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-300 text-emerald-800 text-sm font-medium flex items-center gap-1 dark:bg-emerald-500/20 dark:border-emerald-400/30 dark:text-emerald-300">
                        <CheckCircle size={14} /> Verified
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-yellow-500/15 border border-yellow-300 text-yellow-800 text-sm font-medium flex items-center gap-1 dark:bg-yellow-500/20 dark:border-yellow-400/30 dark:text-yellow-300">
                        <AlertCircle size={14} /> Pending
                      </span>
                    )}
                  </div>
                </div>
                {isCompanyOwner && (
                  <button
                    onClick={() => navigate(ROUTES.recruiter.editCompany, { state: { fromDashboard: true } })}
                    className="p-3 rounded-xl bg-white/70 border border-slate-200 text-slate-600 hover:bg-white transition-all duration-200 dark:bg-white/10 dark:border-white/20 dark:text-slate-300 dark:hover:bg-white/20"
                    title="Update company information"
                  >
                    <Settings size={20} />
                  </button>
                )}
              </div>
              {company.description && (
                <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">{company.description}</p>
              )}
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-cyan-700 hover:text-cyan-800 font-semibold transition-colors dark:text-cyan-400 dark:hover:text-cyan-300">
                  Visit website →
                </a>
              )}
              {isCompanyOwner && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => navigate(ROUTES.recruiter.editCompany, { state: { fromDashboard: true } })}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-cyan-500/20"
                  >
                    <Settings size={16} />
                    Edit company profile and logo
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Invite Member */}
          {isCompanyOwner && (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-white/5 dark:shadow-2xl">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
                  Team Access
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  Invite a member
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Send a secure invite to add HR, recruiter, or interviewer access.
                </p>
              </div>
              <div className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300">
                {company?.name || "Your company"}
              </div>
            </div>

            <form onSubmit={handleInviteMember} className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(180px,0.7fr)_auto]">
              <div>
                <label htmlFor="invite-email" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Work email
                </label>
                <div className="relative">
                  <AtSign size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    id="invite-email"
                    type="email"
                    autoComplete="email"
                    value={inviteMember.email}
                    onChange={(event) => setInviteMember((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="name@company.com"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="invite-role" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Role
                </label>
                <select
                  id="invite-role"
                  value={inviteMember.role}
                  onChange={(event) =>
                    setInviteMember((prev) => ({
                      ...prev,
                      role: event.target.value as InviteMemberState["role"],
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-white/10 dark:bg-slate-950/40 dark:text-white"
                >
                  <option value="admin">Admin</option>
                  <option value="hr">HR</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="interviewer">Interviewer</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {inviteLoading ? "Sending..." : "Invite member"}
                </button>
              </div>
            </form>

            {(inviteError || inviteMessage) && (
              <div
                className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                  inviteError
                    ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                }`}
              >
                {inviteError || inviteMessage}
              </div>
            )}
          </div>
          )}

          <div className="mb-8 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-white/5 dark:shadow-2xl">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
                  {isCompanyOwner ? "Owner Controls" : "Team View"}
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  Team Members and Permissions
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {isCompanyOwner
                    ? "After approval, update each member role and permissions individually."
                    : "You can view your company team. Only owner can invite or edit access."}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Your own membership row is excluded from this list.
                </p>
              </div>
              <button
                type="button"
                onClick={() => company?.id && loadCompanyMembers(company.id)}
                disabled={membersLoading || !company?.id}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                <RefreshCw size={14} className={membersLoading ? "animate-spin" : ""} />
                Refresh members
              </button>
            </div>

            {(memberUpdateError || memberUpdateMessage || membersError) && (
              <div
                className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
                  memberUpdateError || membersError
                    ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                }`}
              >
                {memberUpdateError || membersError || memberUpdateMessage}
              </div>
            )}

            {membersLoading ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">Loading team members...</p>
            ) : approvedTeamMembers.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No approved team members found yet.
              </p>
            ) : (
              <div className="space-y-4">
                {approvedTeamMembers.map((member) => {
                  const isOwner = member.role === "owner";
                  const canEdit = isCompanyOwner && Boolean(member.is_approved) && !isOwner;
                  const canViewPermissions = isCompanyOwner;
                  const memberId = `${member.id}`;
                  const memberLayoutClass = canViewPermissions
                    ? "grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-start"
                    : "grid gap-4 lg:grid-cols-[220px_auto] lg:items-start";
                  return (
                    <article
                      key={member.id}
                      className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/60"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {member.invite_email || member.email || "Member"}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Member status: {member.is_approved ? "Approved" : "Pending approval"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOwner && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300">
                              <ShieldCheck size={12} /> Owner
                            </span>
                          )}
                          {!member.is_approved && (
                            <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                              Waiting for approval
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={memberLayoutClass}>
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                            Role
                          </label>
                          {isCompanyOwner ? (
                            <select
                              value={member.role}
                              onChange={(event) =>
                                handleMemberRoleChange(memberId, event.target.value as CompanyMemberRole)
                              }
                              disabled={!canEdit}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950/40 dark:text-white"
                            >
                              {isOwner ? (
                                <option value="owner">Owner</option>
                              ) : (
                                editableRoles.map((role) => (
                                  <option key={role} value={role}>
                                    {role.toUpperCase()}
                                  </option>
                                ))
                              )}
                            </select>
                          ) : (
                            <div className="inline-flex items-center rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {roleTitleByCode[member.role] || "Member"}
                            </div>
                          )}
                        </div>

                        {canViewPermissions ? (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                              Permissions
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {permissionFields.map((field) => (
                                <label
                                  key={`${member.id}-${field.key}`}
                                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200"
                                >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(member[field.key])}
                                    disabled={!canEdit}
                                    onChange={(event) =>
                                      handleMemberPermissionToggle(memberId, field.key, event.target.checked)
                                    }
                                    className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                  />
                                  {field.label}
                                </label>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div className="flex items-end">
                          {isCompanyOwner ? (
                            <button
                              type="button"
                              disabled={!canEdit || savingMemberId === memberId}
                              onClick={() => handleSaveMemberAccess(member)}
                              className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingMemberId === memberId ? "Saving..." : "Save access"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {isCompanyOwner && (
            <div className="mb-8 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-white/5 dark:shadow-2xl">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                    Owner Controls
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                    Pending Member Approvals
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Members waiting for approval are listed here separately.
                  </p>
                </div>
              </div>

              {pendingApprovalMembers.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">No pending member approvals.</p>
              ) : (
                <div className="space-y-3">
                  {pendingApprovalMembers.map((member) => (
                    <article
                      key={`pending-${member.id}`}
                      className="rounded-xl border border-amber-300/50 bg-amber-50/60 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {member.invite_email || member.email || "Pending member"}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Member status: Pending approval
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                            Waiting for approval
                          </span>
                          <span className="rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-300">
                            {roleTitleByCode[member.role] || "Member"}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { icon: Plus, label: "Open Positions", value: stats.openJobs, trend: "Active hiring", color: "from-emerald-500 to-teal-600", bgColor: "bg-emerald-500/20" },
              { icon: Users, label: "Applications", value: stats.totalApplications, trend: "In pipeline", color: "from-blue-500 to-cyan-600", bgColor: "bg-blue-500/20" },
              { icon: Clock, label: "Interviews", value: stats.interviewsScheduled, trend: "This month", color: "from-amber-500 to-orange-600", bgColor: "bg-amber-500/20" },
              { icon: BarChart3, label: "Offers", value: stats.offersExtended, trend: "Awaiting response", color: "from-violet-500 to-purple-600", bgColor: "bg-violet-500/20" },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="group relative p-6 rounded-2xl bg-white/80 border border-slate-200 backdrop-blur-xl hover:bg-white transition-all duration-300 overflow-hidden dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/[0.08]">
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-50 transition-opacity" style={{backgroundImage: `linear-gradient(to right, rgb(6, 182, 212), rgb(8, 145, 178))`}}></div>
                  <div className="relative z-10">
                    <div className={`w-14 h-14 rounded-xl ${stat.bgColor} flex items-center justify-center mb-4`}>
                      <Icon className="text-white" size={28} />
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">{stat.label}</p>
                    <h3 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">{stat.value}</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">{stat.trend}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {workflowCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.title} className="group relative p-8 rounded-2xl bg-white/80 border border-slate-200 backdrop-blur-xl hover:bg-white transition-all duration-300 overflow-hidden cursor-pointer dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/[0.08]">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity blur-xl bg-gradient-to-br" style={{backgroundImage: `linear-gradient(to right, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))`}}></div>
                    <div className="relative z-10 text-center">
                      <div className={`w-16 h-16 rounded-2xl ${card.bgColor} flex items-center justify-center mx-auto mb-4`}>
                        <Icon className={card.iconColor} size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{card.title}</h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">{card.desc}</p>
                      <button className={`w-full py-3 rounded-xl bg-gradient-to-r ${card.color} text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-200`}>
                        Get started →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Recent Activity</h2>
              <div className="space-y-4">
                {recentActivity.map((activity, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-white/80 border border-slate-200 backdrop-blur-sm hover:bg-white transition-all duration-200 flex items-start gap-4 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/[0.08]">
                    <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${activity.status === "success" ? "bg-emerald-500" : "bg-blue-500"}`}></div>
                    <div className="flex-1">
                      <p className="text-slate-900 dark:text-white font-medium">{activity.action}</p>
                      <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro Tip */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-100 to-cyan-100 border border-emerald-300/60 backdrop-blur-xl dark:from-emerald-500/20 dark:to-cyan-500/20 dark:border-emerald-400/30">
              <div className="flex items-start gap-3 mb-3">
                <MessageSquare className="text-emerald-400 flex-shrink-0 mt-1" size={24} />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pro Tip</h3>
              </div>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-sm">
                Set up your first job posting to start receiving applications from qualified candidates. Our AI will help you find the best matches.
              </p>
              <button className="mt-4 w-full py-2 rounded-lg bg-white/80 hover:bg-white text-slate-900 font-medium text-sm transition-all duration-200 border border-slate-200 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:border-white/20">
                Learn more
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
