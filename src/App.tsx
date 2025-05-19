import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './lib/services/auth'
import Layout from './components/Layout/index'
import { Home } from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Issues from './pages/Issues'
import ReportProblem from './pages/ReportProblem'
import { AuthProvider } from './components/AuthProvider'
import { Admin } from './pages/Admin'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import UserProfile from './pages/UserProfile'
import ForgotPassword from './pages/ForgotPassword'

// Add a new ProtectedRoute component
const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('ProtectedAdminRoute - User:', user);
    console.log('ProtectedAdminRoute - User role:', user?.roli);
    if (!user?.roli || user.roli !== 'institution') {
      console.log('ProtectedAdminRoute - Redirecting to home');
      navigate('/');
    }
  }, [user, navigate]);

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="issues" element={<Issues />} />
            <Route path="report" element={<ReportProblem />} />
            <Route 
              path="admin" 
              element={
                <ProtectedAdminRoute>
                  <Admin />
                </ProtectedAdminRoute>
              } 
            />
            <Route path="profile" element={<UserProfile />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App 