import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useSocket } from '../context/SocketContext';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Building2,
  Bell,
  LogOut,
  Menu,
  X,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { isConnected, onlineCount } = useSocket();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard', roles: ['ADMIN', 'PM', 'DEVELOPER'] },
    { to: '/projects', icon: <FolderKanban size={20} />, label: 'Projects', roles: ['ADMIN', 'PM', 'DEVELOPER'] },
    { to: '/tasks', icon: <CheckSquare size={20} />, label: 'Tasks', roles: ['ADMIN', 'PM', 'DEVELOPER'] },
    { to: '/clients', icon: <Building2 size={20} />, label: 'Clients', roles: ['ADMIN', 'PM'] },
    { to: '/users', icon: <Users size={20} />, label: 'Users', roles: ['ADMIN'] },
  ];

  const roleLabel = user?.role === 'PM' ? 'Project Manager' : user?.role === 'DEVELOPER' ? 'Developer' : 'Admin';
  const roleColor = user?.role === 'ADMIN' ? '#f59e0b' : user?.role === 'PM' ? '#8b5cf6' : '#10b981';

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">V</div>
            <span className="logo-text">Velozity</span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems
            .filter((item) => user && item.roles.includes(user.role))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar" style={{ background: roleColor }}>
              {user?.name?.charAt(0)}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name}</span>
              <span className="user-role" style={{ color: roleColor }}>{roleLabel}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-content">
        {/* Header */}
        <header className="top-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
              <Menu size={22} />
            </button>
          </div>
          <div className="header-right">
            {/* Online indicator */}
            <div className={`online-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
              <span>{onlineCount} online</span>
            </div>

            {/* Notifications */}
            <div className="notification-wrapper">
              <button
                className="notification-btn"
                onClick={() => setNotifOpen(!notifOpen)}
                id="notification-bell"
              >
                <Bell size={20} />
                {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>

              {notifOpen && (
                <>
                  <div className="notif-overlay" onClick={() => setNotifOpen(false)} />
                  <div className="notification-dropdown">
                    <div className="notif-header">
                      <h3>Notifications</h3>
                      {unreadCount > 0 && (
                        <button className="mark-all-btn" onClick={markAllAsRead}>
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="notif-list">
                      {notifications.length === 0 ? (
                        <div className="notif-empty">No notifications</div>
                      ) : (
                        notifications.slice(0, 20).map((n) => (
                          <div
                            key={n.id}
                            className={`notif-item ${n.isRead ? '' : 'unread'}`}
                            onClick={() => {
                              if (!n.isRead) markAsRead(n.id);
                              if (n.relatedTask?.projectId) {
                                navigate(`/projects/${n.relatedTask.projectId}`);
                                setNotifOpen(false);
                              }
                            }}
                          >
                            <p className="notif-message">{n.message}</p>
                            <span className="notif-time">
                              {formatTimeAgo(n.createdAt)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
};

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return date.toLocaleDateString();
}

export default Layout;
