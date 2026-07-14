import { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';
import type { ChatMessage, TenantOption } from './types';
import TopNavbar from './components/TopNavbar';
import RichAnalyticsDashboard from './components/RichAnalyticsDashboard';
import { analyticsCache, insightsCache } from './api/cache';
import {
  getTenants,
  loginTenant,
  getDashboardAnalytics,
  getWeeklyInsights,
  streamCopilotChat
} from './api';
import CopilotDrawer from './components/CopilotDrawer';
import LoginPage from './components/LoginPage';
import LoadingScreen from './components/LoadingScreen';
import ToastContainer from './components/ToastContainer';
import type { Toast, ToastType } from './components/ToastContainer';

const DEFAULT_PASSWORD = import.meta.env.VITE_DEFAULT_PASSWORD;

const getOrgDisplayName = (tid: string, list: TenantOption[] = []) => {
  const found = list.find(t => t.id === tid);
  if (found && found.name) return found.name;
  return localStorage.getItem('cortex_active_tenant_name') || tid || 'Organization';
};

export default function App() {
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [activeTenant, setActiveTenant] = useState<string>(() => localStorage.getItem('cortex_active_tenant') || '');
  const [accessToken, setAccessToken] = useState<string>(() => localStorage.getItem('cortex_access_token') || '');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => !!localStorage.getItem('cortex_access_token'));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const isCopilotOpenRef = useRef(isCopilotOpen);
  useEffect(() => {
    isCopilotOpenRef.current = isCopilotOpen;
  }, [isCopilotOpen]);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('cortex_theme') as 'light' | 'dark') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cortex_theme', theme);
  }, [theme]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast_${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    if (isCopilotOpen) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
      return () => clearTimeout(timer);
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isCopilotOpen]);

  useEffect(() => {
    const fetchTenantsFromDb = async () => {
      try {
        const res = await getTenants();
        const data: TenantOption[] = res.tenants || [];
        setTenants(data);
        const savedTenant = localStorage.getItem('cortex_active_tenant');
        const savedToken = localStorage.getItem('cortex_access_token');
        if (savedToken && savedTenant) {
          fetchTenantDataWithToken(savedTenant, savedToken);
        } else if (data.length > 0 && !savedTenant) {
          setActiveTenant(prev => prev || data[0].id);
        }
      } catch (err: any) {
        console.warn('Could not load initial tenant configurations from database:', err.message);
      }
    };

    fetchTenantsFromDb();
  }, []);

  const handleLoginSuccess = (tenantId: string, token: string) => {
    localStorage.setItem('cortex_active_tenant', tenantId);
    localStorage.setItem('cortex_access_token', token);
    const orgName = getOrgDisplayName(tenantId, tenants);
    localStorage.setItem('cortex_active_tenant_name', orgName);
    setActiveTenant(tenantId);
    setAccessToken(token);
    setIsLoggedIn(true);
    fetchTenantDataWithToken(tenantId, token);
    addToast('Signed in successfully', 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('cortex_active_tenant');
    localStorage.removeItem('cortex_active_tenant_name');
    localStorage.removeItem('cortex_access_token');
    setIsLoggedIn(false);
    setAccessToken('');
    setMessages([]);
    setErrorMessage('');
    addToast('Signed out', 'info');
  };

  const fetchTenantDataWithToken = async (tenantId: string, token: string) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      let activeToken = token;
      if (!activeToken) {
        const authData = await loginTenant(tenantId, DEFAULT_PASSWORD);
        activeToken = authData.access_token;
        setAccessToken(activeToken);
        localStorage.setItem('cortex_access_token', activeToken);
        if (authData.user?.company_name || authData.company_name) {
          localStorage.setItem('cortex_active_tenant_name', authData.user?.company_name || authData.company_name);
        }
      }
      const timeRange = 'Today';
      const cacheKey = `${tenantId}_${timeRange}`;
      try {
        const [dashData, insData] = await Promise.all([
          getDashboardAnalytics(timeRange, activeToken),
          getWeeklyInsights(activeToken)
        ]);
        analyticsCache[cacheKey] = dashData;
        insightsCache[tenantId] = insData.insights || [];
      } catch (preloadErr) {
        console.warn('Background telemetry preload warning:', preloadErr);
      }

      setMessages([{
        id: `msg_init_${Date.now()}`,
        sender: 'assistant',
        text: `Hello! I am monitoring live telemetry and billing for **__ORG_NAME__**. Ask me anything about demand anomalies, power factor penalties, or billing optimization.`,
        guardStatus: 'VERIFIED_PASS'
      }]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to connect to backend server.');
      setMessages([{
        id: `msg_err_${Date.now()}`,
        sender: 'assistant',
        text: 'Unable to load telemetry from backend API. Please check server status.',
        guardStatus: 'INTERCEPTED_AND_FALLBACK'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (queryToSend?: string) => {
    const text = queryToSend || inputQuery;
    if (!text.trim() || isStreaming) return;

    if (!isCopilotOpen) {
      setIsCopilotOpen(true);
    }

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: text
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsStreaming(true);

    const asstId = `asst_${Date.now()}`;
    setMessages(prev => [...prev, {
      id: asstId,
      sender: 'assistant',
      text: '',
      guardStatus: 'RUNNING'
    }]);

    try {
      await streamCopilotChat(
        text,
        accessToken,
        (fullText) => {
          setMessages(prev => prev.map(m => m.id === asstId ? { ...m, text: fullText, guardStatus: 'RUNNING' } : m));
        },
        (result) => {
          setMessages(prev => prev.map(m => m.id === asstId ? {
            ...m,
            text: result.fullText,
            guardStatus: result.status,
            numbersChecked: result.numbersChecked
          } : m));
          if (!isCopilotOpenRef.current) {
            addToast('Copilot response ready — open chat to view', 'success');
          }
        }
      );
    } catch (err: any) {
      const status = err.message?.match(/status (\d+)/)?.[1];
      if (status === '401' || status === '403') {
        handleLogout();
        return;
      }
      let friendlyMsg = "Oops! Something went wrong. Please try again in a moment.";
      if (status === '500') {
        friendlyMsg = "Our analysis engine encountered an issue. Please try rephrasing your question.";
      } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        friendlyMsg = "Unable to reach the server. Please check your connection and try again.";
      }
      setMessages(prev => prev.map(m => m.id === asstId ? {
        ...m,
        text: friendlyMsg,
        guardStatus: 'INTERCEPTED_AND_FALLBACK'
      } : m));
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="cortex-app-container">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <TopNavbar
        tenants={tenants}
        activeTenant={activeTenant}
        isLoggedIn={isLoggedIn && !isLoading}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
      />



      {!isLoggedIn ? (
        <LoginPage
          tenants={tenants}
          onLoginSuccess={handleLoginSuccess}
          errorMessage={errorMessage}
          onClearError={() => setErrorMessage('')}
        />
      ) : isLoading ? (
        <LoadingScreen tenantId={activeTenant} tenantName={getOrgDisplayName(activeTenant, tenants)} />
      ) : (
        <main className="cortex-main-workspace">
          <RichAnalyticsDashboard tenantId={activeTenant} accessToken={accessToken} />

          <CopilotDrawer
            messages={messages}
            tenantName={getOrgDisplayName(activeTenant, tenants)}
            inputQuery={inputQuery}
            isStreaming={isStreaming}
            isOpen={isCopilotOpen}
            onOpen={() => setIsCopilotOpen(true)}
            onClose={() => setIsCopilotOpen(false)}
            onInputChange={setInputQuery}
            onSendMessage={handleSendMessage}
            messagesEndRef={messagesEndRef}
          />
        </main>
      )}
    </div>
  );
}

