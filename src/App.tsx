import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactElement } from "react";
import AdminDashboard from "./pages/AdminDashboard";
import CreateCompany from "./pages/CreateCompany";
import Login from "./pages/Login";
import PendingApproval from "./pages/PendingApproval";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import RecruiterProfile from "./pages/RecruiterProfile";
import {
  getAccessToken,
  getAuthRole,
  getRecruiterCompanyStage,
} from "./utils/authSession";
import { ROUTES } from "./routes/paths";

function RequireRoleAuth({
  role,
  children,
}: {
  role: "admin" | "recruiter" | "candidate";
  children: ReactElement;
}) {
  const accessToken = getAccessToken();
  const currentRole = getAuthRole();

  if (!accessToken || currentRole !== role) {
    const redirectPath =
      role === "admin"
        ? ROUTES.auth.adminLogin
        : role === "candidate"
          ? ROUTES.auth.candidateLogin
          : ROUTES.auth.recruiterLogin;
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

function RequireRecruiterCompanyStage({
  requiredStage,
  children,
}: {
  requiredStage: "no-company" | "pending-approval" | "approved";
  children: ReactElement;
}) {
  const accessToken = getAccessToken();
  const role = getAuthRole();
  const stage = getRecruiterCompanyStage() ?? "no-company";

  if (!accessToken || role !== "recruiter") {
    return <Navigate to={ROUTES.auth.recruiterLogin} replace />;
  }

  if (stage !== requiredStage) {
    if (stage === "approved") {
      return <Navigate to={ROUTES.dashboard.recruiter} replace />;
    }

    if (stage === "pending-approval") {
      return <Navigate to={ROUTES.recruiter.pendingApproval} replace />;
    }

    return <Navigate to={ROUTES.recruiter.createCompany} replace />;
  }

  return children;
}

function RequireRecruiterCompanyStages({
  allowedStages,
  children,
}: {
  allowedStages: Array<"no-company" | "pending-approval" | "approved">;
  children: ReactElement;
}) {
  const accessToken = getAccessToken();
  const role = getAuthRole();
  const stage = getRecruiterCompanyStage() ?? "no-company";

  if (!accessToken || role !== "recruiter") {
    return <Navigate to={ROUTES.auth.recruiterLogin} replace />;
  }

  if (!allowedStages.includes(stage)) {
    if (stage === "approved") {
      return <Navigate to={ROUTES.dashboard.recruiter} replace />;
    }

    if (stage === "pending-approval") {
      return <Navigate to={ROUTES.recruiter.pendingApproval} replace />;
    }

    return <Navigate to={ROUTES.recruiter.createCompany} replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route path={ROUTES.root} element={<Navigate to={ROUTES.auth.login} replace />} />
      <Route
        path={ROUTES.auth.login}
        element={<Login defaultLoginRole="candidate" lockLoginRole />}
      />
      <Route
        path={ROUTES.auth.adminLogin}
        element={<Login defaultLoginRole="admin" lockLoginRole />}
      />
      <Route
        path={ROUTES.auth.recruiterLogin}
        element={<Login defaultLoginRole="recruiter" lockLoginRole />}
      />
      <Route path={ROUTES.legacy.adminLogin} element={<Navigate to={ROUTES.auth.adminLogin} replace />} />
      <Route path={ROUTES.legacy.recruiterLogin} element={<Navigate to={ROUTES.auth.recruiterLogin} replace />} />
      <Route path={ROUTES.legacy.recruiterLoginTypo1} element={<Navigate to={ROUTES.auth.recruiterLogin} replace />} />
      <Route path={ROUTES.legacy.recruiterLoginTypo2} element={<Navigate to={ROUTES.auth.recruiterLogin} replace />} />
      <Route
        path={ROUTES.dashboard.admin}
        element={
          <RequireRoleAuth role="admin">
            <AdminDashboard />
          </RequireRoleAuth>
        }
      />
      <Route
        path={ROUTES.recruiter.createCompany}
        element={
          <RequireRecruiterCompanyStage requiredStage="no-company">
            <CreateCompany />
          </RequireRecruiterCompanyStage>
        }
      />
      <Route
        path={ROUTES.recruiter.editCompany}
        element={
          <RequireRecruiterCompanyStages allowedStages={["pending-approval", "approved"]}>
            <CreateCompany />
          </RequireRecruiterCompanyStages>
        }
      />
      <Route
        path={ROUTES.recruiter.pendingApproval}
        element={
          <RequireRecruiterCompanyStage requiredStage="pending-approval">
            <PendingApproval />
          </RequireRecruiterCompanyStage>
        }
      />
      <Route
        path={ROUTES.dashboard.recruiter}
        element={
          <RequireRecruiterCompanyStage requiredStage="approved">
            <RecruiterDashboard />
          </RequireRecruiterCompanyStage>
        }
      />
      <Route
        path={ROUTES.recruiter.profile}
        element={
          <RequireRoleAuth role="recruiter">
            <RecruiterProfile />
          </RequireRoleAuth>
        }
      />
      <Route path={ROUTES.legacy.adminDashboard} element={<Navigate to={ROUTES.dashboard.admin} replace />} />
      <Route path="*" element={<Navigate to={ROUTES.auth.login} replace />} />
    </Routes>
  );
}

export default App;
