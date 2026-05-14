import { Navigate } from 'react-router';
import { isAuthenticated } from '../../services/auth';
import DashboardLayout from '../layouts/DashboardLayout';

export default function ProtectedLayout() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardLayout />;
}