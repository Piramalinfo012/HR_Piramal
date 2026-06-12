import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    localStorage.removeItem('user');
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
