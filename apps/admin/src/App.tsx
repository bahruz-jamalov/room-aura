import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { permissions } from "@room-aura/shared";
import { AuthProvider } from "./auth/AuthContext";
import AdminLayout, { RootRedirect } from "./components/AdminLayout";
import RequireCapability from "./components/RequireCapability";
import { PlatformAuthProvider } from "./platform/PlatformAuthContext";
import PlatformAnalyticsScreen from "./platform/PlatformAnalyticsScreen";
import PlatformCatalogScreen from "./platform/PlatformCatalogScreen";
import PlatformHotelDetailScreen from "./platform/PlatformHotelDetailScreen";
import PlatformHotelsScreen from "./platform/PlatformHotelsScreen";
import PlatformLayout from "./platform/PlatformLayout";
import AccessScreen from "./screens/AccessScreen";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import ChatScreen from "./screens/ChatScreen";
import DashboardScreen from "./screens/DashboardScreen";
import FaqScreen from "./screens/FaqScreen";
import FeedbackScreen from "./screens/FeedbackScreen";
import DepartmentsScreen from "./screens/DepartmentsScreen";
import MenuScreen from "./screens/MenuScreen";
import RequestsScreen from "./screens/RequestsScreen";
import RoomsScreen from "./screens/RoomsScreen";
import ServicesScreen from "./screens/ServicesScreen";
import SettingsScreen from "./screens/SettingsScreen";
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
            <Route path="/chat" element={<ChatScreen />} />
            <Route path="/faqs" element={<FaqScreen />} />
            <Route path="/services" element={<ServicesScreen />} />
            <Route path="/menu" element={<MenuScreen />} />
            <Route path="/departments" element={<DepartmentsScreen />} />
            <Route path="/rooms" element={<RoomsScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
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

          <Route
            path="/platform"
            element={
              <PlatformAuthProvider>
                <PlatformLayout />
              </PlatformAuthProvider>
            }
          >
            <Route index element={<Navigate to="hotels" replace />} />
            <Route path="hotels" element={<PlatformHotelsScreen />} />
            <Route path="hotels/:hotelId" element={<PlatformHotelDetailScreen />} />
            <Route path="catalog" element={<PlatformCatalogScreen />} />
            <Route path="analytics" element={<PlatformAnalyticsScreen />} />
          </Route>

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
