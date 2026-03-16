import { createBrowserRouter } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import PublicRoute from "./PublicRoute";
import NotFound from "../pages/error/NotFound";
import Unauthorized from "../pages/error/Unauthorized";
import NavBar from "../components/NavBar";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import Recovery from "../pages/auth/Recovery";
import Reset from "../pages/auth/Reset";
import Control from "../pages/Control";
import Graphs from "../pages/Graphs";
import Historical from "../pages/Historical";
import Home from "../pages/Home";
import Monitoring from "../pages/Monitoring";
import Profile from "../pages/Profile";

export const RouterApp = createBrowserRouter([
  // Ruta principal con layout
  {
    path: "/",
    element: <NavBar />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: (
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        ),
      },
      {
        path: "control-panel",
        element: (
          <PrivateRoute>
            <Control />
          </PrivateRoute>
        ),
      },
      {
        path: "graphs",
        element: (
          <PrivateRoute>
            <Graphs />
          </PrivateRoute>
        ),
      },
      {
        path: "historical",
        element: (
            <PrivateRoute>
                <Historical />
            </PrivateRoute>
        ),
      },
      {
        path: "monitoring",
        element: (
          <PrivateRoute>
            <Monitoring />
          </PrivateRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        ),
      },
      {
        path: "reset-password/:token",
        element: (
          <PrivateRoute>
            <Reset />
          </PrivateRoute>
        ),
      },
      // ERRORES
      {
        path: "unauthorized",
        element: <Unauthorized />,
      },
    ],
  },

  // PUBLIC ROUTES
  {
    path: "/login",
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: "/register",
    element: (
      <PublicRoute>
        <Register />
      </PublicRoute>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <PublicRoute>
        <Recovery />
      </PublicRoute>
    ),
  }
]);