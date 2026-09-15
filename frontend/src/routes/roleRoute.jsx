import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RoleRoute({ allowedRoles }) {
  const { user } = useAuth();
  if (!allowedRoles.includes(user.rol)) {
    return <Navigate to="/no-autorizado" replace />;
  }
  return <Outlet />;
}