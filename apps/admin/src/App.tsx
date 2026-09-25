import { BrowserRouter, Route, Routes } from "react-router-dom";
import { permissions } from "@room-aura/shared";
import { AuthProvider } from "./auth/AuthContext";
import AdminLayout, { RootRedirect } from "./components/AdminLayout";
import RequireCapability from "./components/RequireCapability";
import AccessScreen from "./screens/AccessScreen";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import DashboardScreen from "./screens/DashboardScreen";
import FeedbackScreen from "./screens/FeedbackScreen";
import DepartmentsScreen from "./screens/DepartmentsScreen";
import MenuScreen from "./screens/MenuScreen";
import RequestsScreen from "./screens/RequestsScreen";
import RoomsScreen from "./screens/RoomsScreen";
import ServicesScreen from "./screens/ServicesScreen";
import StaffScreen from "./screens/StaffScreen";

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
            <Route
              path="/staff"
              element={
                <RequireCapability check={permissions.canManageStaff}>
                  <StaffScreen />
                </RequireCapability>
              }
            />
            <Route
              path="/access"
              element={
                <RequireCapability check={permissions.canManageAccessTokens}>
                  <AccessScreen />
                </RequireCapability>
              }
            />
            <Route
              path="/feedback"
              element={
                <RequireCapability check={permissions.canViewFeedback}>
                  <FeedbackScreen />
                </RequireCapability>
              }
            />
            <Route
              path="/analytics"
              element={
                <RequireCapability check={permissions.canViewAnalytics}>
                  <AnalyticsScreen />
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
