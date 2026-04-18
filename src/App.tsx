import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactElement } from "react";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import { getAccessToken, getAuthRole } from "./utils/authSession";
import { ROUTES } from "./routes/paths";

function RequireRoleAuth({
  role,
  children,
}: {
  role: "admin" | "recruiter";
  children: ReactElement;
}) {
  const accessToken = getAccessToken();
  const currentRole = getAuthRole();

  if (!accessToken || currentRole !== role) {
    const redirectPath = role === "admin" ? ROUTES.auth.adminLogin : ROUTES.auth.recruiterLogin;
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route path={ROUTES.root} element={<Navigate to={ROUTES.auth.candidateLogin} replace />} />
      <Route
        path={ROUTES.auth.candidateLogin}
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
      <Route path={ROUTES.legacy.adminDashboard} element={<Navigate to={ROUTES.dashboard.admin} replace />} />
      <Route path="*" element={<Navigate to={ROUTES.auth.candidateLogin} replace />} />
    </Routes>
  );
}

export default App;
