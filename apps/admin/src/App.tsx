import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import AdminLayout, { RootRedirect } from "./components/AdminLayout";
import DashboardScreen from "./screens/DashboardScreen";
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
          </Route>
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
