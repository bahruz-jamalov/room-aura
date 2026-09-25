import { BrowserRouter, Route, Routes } from "react-router-dom";
import { permissions } from "@room-aura/shared";
import { AuthProvider } from "./auth/AuthContext";
import AdminLayout, { RootRedirect } from "./components/AdminLayout";
import RequireCapability from "./components/RequireCapability";
import DashboardScreen from "./screens/DashboardScreen";
import DepartmentsScreen from "./screens/DepartmentsScreen";
import RequestsScreen from "./screens/RequestsScreen";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={<DashboardScreen />} />
            <Route path="/requests" element={<RequestsScreen />} />
            <Route
              path="/departments"
              element={
                <RequireCapability check={permissions.canManageRoomsAndDepartments}>
                  <DepartmentsScreen />
                </RequireCapability>
              }
            />
          </Route>
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
