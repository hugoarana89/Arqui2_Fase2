import { createBrowserRouter } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import PublicRoute from './PublicRoute';
import NotFound from '../pages/error/NotFound';
import Unauthorized from '../pages/error/Unauthorized';
import NavBar from '../components/NavBar';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import Recovery from '../pages/auth/Recovery';
import Reset from '../pages/auth/Reset';
import Control from '../pages/Control';
import Graphs from '../pages/Graphs';
import Historical from '../pages/Historical';
import Home from '../pages/Home';
import Monitoring from '../pages/Monitoring';
import Profile from '../pages/Profile';
import PlatesAdmin from '../pages/PlatesAdmin';

export const RouterApp = createBrowserRouter([
  // Layout principal (autenticado)
  {
    path: '/',
    element: <NavBar />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <PrivateRoute><Home /></PrivateRoute> },
      { path: 'control-panel', element: <PrivateRoute><Control /></PrivateRoute> },
      { path: 'graphs', element: <PrivateRoute><Graphs /></PrivateRoute> },
      { path: 'historical', element: <PrivateRoute><Historical /></PrivateRoute> },
      { path: 'monitoring', element: <PrivateRoute><Monitoring /></PrivateRoute> },
      { path: 'profile', element: <PrivateRoute><Profile /></PrivateRoute> },
      { path: 'unauthorized', element: <Unauthorized /> },
      { path: 'plates', element: <PrivateRoute><PlatesAdmin /></PrivateRoute> },
    ],
  },

  // Rutas públicas (redirigen al home si ya está autenticado)
  {
    path: '/login',
    element: <PublicRoute><Login /></PublicRoute>,
  },
  {
    path: '/register',
    element: <PublicRoute><Register /></PublicRoute>,
  },
  {
    path: '/forgot-password',
    element: <PublicRoute><Recovery /></PublicRoute>,
  },
  // Reset acepta el token como parámetro de ruta O como query string (?token=...)
  {
    path: '/reset-password',
    element: <Reset />,
  },
  {
    path: '/reset-password/:token',
    element: <Reset />,
  },
]);
