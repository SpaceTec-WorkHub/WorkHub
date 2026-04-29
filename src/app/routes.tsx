import { createBrowserRouter } from "react-router";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MapView from "./pages/MapView";
import Reservation from "./pages/Reservation";
import CheckInOut from "./pages/CheckInOut";
import Admin from "./pages/Admin";
import Gamification from "./pages/Gamification";
import Carpool from "./pages/Carpool";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    element: <Layout />,
    children: [
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/map", element: <MapView /> },
      { path: "/reservation", element: <Reservation /> },
      { path: "/check-in-out", element: <CheckInOut /> },
      { path: "/admin", element: <Admin /> },
      { path: "/gamification", element: <Gamification /> },
      { path: "/carpool", element: <Carpool /> },
    ],
  },
]);
