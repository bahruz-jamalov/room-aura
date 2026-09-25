import { BrowserRouter, Route, Routes } from "react-router-dom";
import { permissions } from "@room-aura/shared";
import { AuthProvider } from "./auth/AuthContext";
import AdminLayout, { RootRedirect } from "./components/AdminLayout";
import RequireCapability from "./components/RequireCapability";
import DashboardScreen from "./screens/DashboardScreen";
import DepartmentsScreen from "./screens/DepartmentsScreen";
import MenuScreen from "./screens/MenuScreen";
import RequestsScreen from "./screens/RequestsScreen";
import RoomsScreen from "./screens/RoomsScreen";
import ServicesScreen from "./screens/ServicesScreen";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={<DashboardScreen />} />
            <Route path="/requests" element={<RequestsScreen />} />
            <Route path="/services" element={<ServicesScreen />} />
            <Route path="/menu" element={<MenuScreen />} />
            <Route
              path="/departments"
              element={
                <RequireCapability check={permissions.canManageRoomsAndDepartments}>
                  <DepartmentsScreen />
                </RequireCapability>
              }
            />
            <Route
              path="/rooms"
              element={
                <RequireCapability check={permissions.canManageRoomsAndDepartments}>
                  <RoomsScreen />
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
