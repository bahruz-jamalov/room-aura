import "./i18n";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { GuestSessionProvider, useGuestSession } from "./guest/GuestSessionContext";
import ConnectCodeScreen from "./screens/ConnectCodeScreen";
import ConnectScreen from "./screens/ConnectScreen";
import HomeScreen from "./screens/HomeScreen";
import HotelScreen from "./screens/HotelScreen";
import MyRequestsScreen from "./screens/MyRequestsScreen";
import RedeemTokenScreen from "./screens/RedeemTokenScreen";
import ServiceCategoryScreen from "./screens/ServiceCategoryScreen";
import ServicesScreen from "./screens/ServicesScreen";
import SettingsScreen from "./screens/SettingsScreen";
import WelcomeScreen from "./screens/WelcomeScreen";

function RootRedirect() {
  const { status } = useGuestSession();
  if (status === "loading") return null;
  return <Navigate to={status === "active" ? "/home" : "/welcome"} replace />;
}

export default function App() {
  return (
    <GuestSessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/welcome" element={<WelcomeScreen />} />
          <Route path="/connect" element={<ConnectScreen />} />
          <Route path="/connect/code" element={<ConnectCodeScreen />} />
          <Route path="/j/:token" element={<RedeemTokenScreen />} />

          <Route element={<AppLayout />}>
            <Route path="/home" element={<HomeScreen />} />
            <Route path="/services" element={<ServicesScreen />} />
            <Route path="/services/:categoryId" element={<ServiceCategoryScreen />} />
            <Route path="/requests" element={<MyRequestsScreen />} />
            <Route path="/hotel" element={<HotelScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GuestSessionProvider>
  );
}
