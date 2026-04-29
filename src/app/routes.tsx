import React from "react";
import { Navigate, createBrowserRouter } from "react-router";
import ProtectedLayout from "./components/ProtectedLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MapView from "./pages/Map";
import Reservation from "./pages/Reservation";
import ReservationHistory from "./pages/ReservationHistory";
import AdminOnlyRoute from "./components/AdminOnlyRoute";
import CheckInOut from "./pages/CheckInOut";
import Gamification from "./pages/Gamification";
import Carpool from "./pages/Carpool";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: ProtectedLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "map", Component: MapView },
      { path: "reservation", Component: Reservation },
      { path: "reservations", Component: ReservationHistory },
      { path: "check-in-out", Component: CheckInOut },
      { path: "admin", Component: AdminOnlyRoute },
      { path: "gamification", Component: Gamification },
      { path: "carpool", Component: Carpool },
    ],
  },
  {
    path: "*",
    Component: () => <Navigate to="/" replace />,
  },
]);