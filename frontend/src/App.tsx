import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { getToken } from './api/client';
import Layout from './components/Layout';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import ListViewPage from './pages/ListView';
import WeeklyCreatePage from './pages/WeeklyCreate';
import RecipesPage from './pages/Recipes';
import ProductsPage from './pages/Products';
import StoresPage from './pages/Stores';
import RecurringPage from './pages/Recurring';

function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  if (!getToken()) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="list/:id" element={<ListViewPage />} />
        <Route path="weekly/new" element={<WeeklyCreatePage />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="stores" element={<StoresPage />} />
        <Route path="recurring" element={<RecurringPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
