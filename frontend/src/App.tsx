import { RouterProvider } from 'react-router-dom';
import { RouterApp } from './routes/AppRouter';
import './App.css'

function App() {

  return (
    <>
      <RouterProvider router={RouterApp} />
    </>
  )
}

export default App
