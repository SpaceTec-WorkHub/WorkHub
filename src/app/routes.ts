import { createBrowserRouter } from "react-router";
import DashboardLayout from "./layouts/DashboardLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MapView from "./pages/Map";
import Reservation from "./pages/Reservation";
import CheckIn from "./pages/CheckIn";
import Admin from "./pages/Admin";
import Gamification from "./pages/Gamification";
import Carpool from "./pages/Carpool";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: DashboardLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "dashboard", Component: Dashboard },
      { path: "map", Component: MapView },
      { path: "reservation", Component: Reservation },
      { path: "check-in", Component: CheckIn },
      { path: "admin", Component: Admin },
      { path: "gamification", Component: Gamification },
      { path: "carpool", Component: Carpool },
    ],
  },
]);
