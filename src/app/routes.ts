import { createBrowserRouter } from "react-router";
import ProtectedLayout from "./components/ProtectedLayout";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import MapView from "./pages/Map";
import Reservation from "./pages/Reservation";
import ReservationHistory from "./pages/ReservationHistory";
import CheckInOut from "./pages/CheckInOut";
import Admin from "./pages/Admin";
import Gamification from "./pages/Gamification";
import Carpool from "./pages/Carpool";
import Profile from "./pages/Profile";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/forgot-password",
    Component: ForgotPassword,
  },
  {
    path: "/",
    Component: ProtectedLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "dashboard", Component: Dashboard },
      { path: "map", Component: MapView },
      { path: "reservation", Component: Reservation },
      { path: "reservations", Component: ReservationHistory },
      { path: "check-in", Component: CheckInOut },
      { path: "admin", Component: Admin },
      { path: "gamification", Component: Gamification },
      { path: "carpool", Component: Carpool },
      { path: "profile", Component: Profile },
    ],
  },
]);