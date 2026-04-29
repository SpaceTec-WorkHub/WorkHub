import { Navigate } from 'react-router';
import Layout from './layout/Layout';
import { isAuthenticated } from '../../services/auth';

export default function ProtectedLayout() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
}