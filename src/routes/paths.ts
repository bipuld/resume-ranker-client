export const ROUTES = {
  root: "/",
  auth: {
    login: "/login",
    candidateLogin: "/login",
    adminLogin: "/admin/login",
    recruiterLogin: "/recruiter/login",
  },
  dashboard: {
    admin: "/dashboard/admin",
    recruiter: "/dashboard/recruiter",
  },
  recruiter: {
    createCompany: "/create-company",
    editCompany: "/edit-company",
    pendingApproval: "/pending-approval",
    profile: "/recruiter/profile",
  },
  legacy: {
    adminLogin: "/admin-login",
    recruiterLogin: "/recruiter-login",
    recruiterLoginTypo1: "/recuirte-login",
    recruiterLoginTypo2: "/recuriter-login",
    adminDashboard: "/admin/dashboard",
  },
} as const;

export type AppRole = "candidate" | "recruiter" | "admin";
