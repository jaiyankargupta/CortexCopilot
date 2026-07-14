import { LogOut, Building2, Sun, Moon } from 'lucide-react';
import type { TenantOption } from '../types';
import logoImg from '../assets/logo.png';

interface TopNavbarProps {
  tenants: TenantOption[];
  activeTenant: string;
  onTenantChange?: (tenantId: string) => void;
  isLoggedIn?: boolean;
  onLogout?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export default function TopNavbar({ tenants, activeTenant, isLoggedIn, onLogout, theme, onToggleTheme }: TopNavbarProps) {
  const activeTenantObj = tenants.find(t => t.id === activeTenant);
  const getDisplayName = () => {
    try {
      const token = localStorage.getItem('cortex_access_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.company_name) return payload.company_name;
      }
    } catch {
      // ignore token parse errors
    }
    if (activeTenantObj?.name) return activeTenantObj.name;
    const storedName = localStorage.getItem('cortex_active_tenant_name');
    if (storedName) return storedName;
    return activeTenant;
  };
  const displayName = getDisplayName();

  return (
    <nav className="cortex-top-nav">
      <div className="cortex-brand">
        <img src={logoImg} alt="Vireon Logo" className="brand-logo-nav" />
      </div>

      <div className="cortex-tenant-selector" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {isLoggedIn && (
          <div className="nav-org-right">
            <div className="minimal-org-badge">
              <Building2 size={14} className="org-badge-icon" />
              <span>{displayName}</span>
            </div>

            {onLogout && (
              <button className="minimal-nav-logout" onClick={onLogout} title="Sign out">
                <LogOut size={14} />
                <span>Sign out</span>
              </button>
            )}
          </div>
        )}

        {onToggleTheme && (
          <button
            className="minimal-nav-logout"
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            style={{ padding: '0.4rem', borderRadius: '50%' }}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        )}
      </div>
    </nav>
  );
}
