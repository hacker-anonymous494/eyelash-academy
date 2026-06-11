import { Link, useLocation } from 'react-router-dom';
import { useSignOut } from '@/features/auth/hooks/useSignOut';
import { useAdminNotifications } from '@/features/calls/useAdminNotifications';

const navItems = [
  { to: '/admin', label: 'Overview', icon: '📊' },
  { to: '/admin/courses', label: 'Courses', icon: '📚' },
  { to: '/admin/students', label: 'Students', icon: '👩‍🎓' },
  { to: '/admin/orders', label: 'Orders', icon: '💰' },
  { to: '/admin/chat', label: 'Chat', icon: '💬' },
  { to: '/admin/calls', label: 'Calls', icon: '📞' },
  { to: '/admin/analytics', label: 'Analytics', icon: '📈' },
];

export default function AdminLayout({ children }) {
  useAdminNotifications();
  const location = useLocation();
  const { signOut } = useSignOut();

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white/90 backdrop-blur-xl border-r border-brand-rose-200/40 p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="font-display text-xl font-semibold text-brand-rose-800">Lumière Admin</h1>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                location.pathname === item.to
                  ? 'bg-brand-rose-100 text-brand-rose-800'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>
        <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-700 mt-4">
          Sign Out
        </button>
      </aside>
      {/* Main content */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}