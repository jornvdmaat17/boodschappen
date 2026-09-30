import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { setToken } from '../api/client';
import { disconnectSocket } from '../hooks/useSocket';

const navItems = [
  { to: '/', label: 'Lijsten' },
  { to: '/recipes', label: 'Recepten' },
  { to: '/products', label: 'Producten' },
  { to: '/stores', label: 'Winkels' },
  { to: '/recurring', label: 'Vaste items' },
];

export default function Layout() {
  const navigate = useNavigate();

  function logout() {
    setToken(null);
    disconnectSocket();
    navigate('/login');
  }

  return (
    <div className="min-h-screen">
      <header className="bg-emerald-700 text-white sticky top-0 z-10 shadow">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <NavLink to="/" className="font-bold text-lg">
            🛒 Boodschappen
          </NavLink>
          <button onClick={logout} className="text-sm text-emerald-100 hover:text-white">
            Uitloggen
          </button>
        </div>
        <nav className="max-w-3xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                  isActive ? 'bg-white text-emerald-800 font-medium' : 'text-emerald-100 hover:bg-emerald-600'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
