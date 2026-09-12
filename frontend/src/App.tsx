import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AppLayout from "./layouts/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AttendanceMarking from "./pages/AttendanceMarking";
import Students from "./pages/Students";
import Teachers from "./pages/Teachers";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="mark-attendance" element={<AttendanceMarking />} />
            <Route path="students" element={<Students />} />
            <Route path="teachers" element={<Teachers />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
