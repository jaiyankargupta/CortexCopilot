import { useState } from 'react';
import { Lock, AlertCircle, Building2 } from 'lucide-react';
import type { TenantOption } from '../types';
import logoImg from '../assets/logo.png';
import { loginTenant } from '../api';

interface LoginPageProps {
  tenants: TenantOption[];
  onLoginSuccess: (tenantId: string, token: string) => void;
  errorMessage?: string;
  onClearError?: () => void;
}

export default function LoginPage({ onLoginSuccess, errorMessage, onClearError }: LoginPageProps) {
  const [orgId, setOrgId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string>('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (onClearError) onClearError();

    const targetTenant = orgId.trim();
    if (!targetTenant) {
      setLocalError('Please enter your Organization ID.');
      return;
    }

    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await loginTenant(targetTenant, password);
      if (data.access_token) {
        if (data.user?.company_name) {
          localStorage.setItem('cortex_active_tenant_name', data.user.company_name);
        } else if (data.company_name) {
          localStorage.setItem('cortex_active_tenant_name', data.company_name);
        }
        onLoginSuccess(targetTenant, data.access_token);
      } else {
        throw new Error('No access token received from server.');
      }
    } catch (err: any) {
      setLocalError(err.message || 'Unable to connect to authentication server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="minimal-login-container">
      <div className="minimal-login-card">
        <div className="minimal-login-header">
          <div className="minimal-brand-row">
            <img src={logoImg} alt="Vireon Logo" className="brand-logo-login" />
          </div>
          <h1 className="minimal-title">Sign in</h1>
          <p className="minimal-subtitle">Enter your secure Organization ID and credentials to access industrial intelligence.</p>
        </div>

        {(localError || errorMessage) && (
          <div className="minimal-alert error">
            <AlertCircle size={16} />
            <span>{localError || errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="minimal-form">
          <div className="minimal-field">
            <label className="minimal-label">Organization ID</label>
            <div className="minimal-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Building2 size={16} color="var(--cortex-text-muted)" style={{ position: 'absolute', left: '0.85rem' }} />
              <input
                type="text"
                className="minimal-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Enter Organization ID (e.g. 1001)"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="minimal-field">
            <label className="minimal-label">Password</label>
            <input
              type="password"
              className="minimal-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="minimal-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="minimal-btn-loading">
                <span className="minimal-spinner" />
                Signing in...
              </span>
            ) : (
              <span>Sign in</span>
            )}
          </button>
        </form>

        <div className="minimal-footer">
          <Lock size={13} className="footer-lock" />
          <span>Protected by CortexGuard isolated tenant boundary</span>
        </div>
      </div>
    </div>
  );
}
