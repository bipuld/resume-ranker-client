export const ROUTES = {
  root: "/",
  auth: {
    candidateLogin: "/login",
    adminLogin: "/admin/login",
    recruiterLogin: "/recruiter/login",
  },
  dashboard: {
    admin: "/dashboard/admin",
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
