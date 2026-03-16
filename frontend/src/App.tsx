import { RouterProvider } from 'react-router-dom';
import { RouterApp } from './routes/AppRouter';
import { AuthProvider } from './context/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={RouterApp} />
    </AuthProvider>
  );
}

export default App;
