import "./i18n";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { CartProvider } from "./cart/CartContext";
import { GuestSessionProvider, useGuestSession } from "./guest/GuestSessionContext";
import CartScreen from "./screens/CartScreen";
import ConnectCodeScreen from "./screens/ConnectCodeScreen";
import ConnectScreen from "./screens/ConnectScreen";
import FeedbackScreen from "./screens/FeedbackScreen";
import HomeScreen from "./screens/HomeScreen";
import HotelScreen from "./screens/HotelScreen";
import MenuCategoryScreen from "./screens/MenuCategoryScreen";
import MenuScreen from "./screens/MenuScreen";
import MyRequestsScreen from "./screens/MyRequestsScreen";
import OtherRequestScreen from "./screens/OtherRequestScreen";
import RedeemTokenScreen from "./screens/RedeemTokenScreen";
import RequestDetailScreen from "./screens/RequestDetailScreen";
import ServiceCategoryScreen from "./screens/ServiceCategoryScreen";
import ServiceDetailScreen from "./screens/ServiceDetailScreen";
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
      <CartProvider>
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
              <Route path="/services/:categoryId/:serviceId" element={<ServiceDetailScreen />} />
              <Route path="/request/other" element={<OtherRequestScreen />} />
              <Route path="/menu" element={<MenuScreen />} />
              <Route path="/menu/:menuCategoryId" element={<MenuCategoryScreen />} />
              <Route path="/cart" element={<CartScreen />} />
              <Route path="/requests" element={<MyRequestsScreen />} />
              <Route path="/requests/:requestId" element={<RequestDetailScreen />} />
              <Route path="/requests/:requestId/feedback" element={<FeedbackScreen />} />
              <Route path="/hotel" element={<HotelScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </GuestSessionProvider>
  );
}
