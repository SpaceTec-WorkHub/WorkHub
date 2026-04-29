import { Navigate } from 'react-router';
import { isAdminUser } from '../../services/auth';
import Admin from '../pages/Admin';

export default function AdminOnlyRoute() {
  if (!isAdminUser()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Admin />;
}