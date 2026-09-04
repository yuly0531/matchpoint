import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import MainPage from './pages/MainPage';
import CameraPage from './pages/CameraPage';
import CapturePreviewPage from './pages/CapturePreviewPage';
import AnalyzingPage from './pages/AnalyzingPage';
import ResultPage from './pages/ResultPage';
import ReportPage from './pages/ReportPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import MyPage from './pages/MyPage';
import FindAccountPage from './pages/FindAccountPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import HistoryPage from './pages/HistoryPage';
import NotificationPage from './pages/NotificationPage';
import ProfilePage from './pages/ProfilePage';
import ChildProfilePage from './pages/ChildProfilePage';
import CareGuidePage from './pages/CareGuidePage';
import PreCapturePage from './pages/PreCapturePage';
import MonthlyReportPage from './pages/MonthlyReportPage';

function App() {
  const savedSession = (() => {
    const value = sessionStorage.getItem('smileguard-session') || localStorage.getItem('smileguard-session');
    try { return value ? JSON.parse(value) : null; } catch { return null; }
  })();
  const resetToken = new URLSearchParams(window.location.search).get('resetToken');
  const [session, setSession] = useState(savedSession);
  const initialPage = (() => {
    if (resetToken) return 'reset-password';
    return savedSession ? 'home' : 'login';
  })();
  const [page, setPage] = useState(initialPage);
  const pageRef = useRef(initialPage);
  const sessionRef = useRef(savedSession);
  const capturedOriginalBlobRef = useRef(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedUrl, setCapturedUrl] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [monthlyReportMonth, setMonthlyReportMonth] = useState(null);
  const [selectedChildId, setSelectedChildId] = useState(() => {
    const saved = localStorage.getItem('smileguard-selected-child');
    return saved ? Number(saved) : null;
  });

  const navigate = useCallback((nextPage, options = {}) => {
    if (!nextPage) return;
    const { replace = false, resetDepth = false } = options;
    if (!replace && nextPage === pageRef.current) return;

    const currentState = window.history.state || {};
    const currentDepth = Number(currentState.smileguardDepth) || 0;
    let nextDepth = currentDepth + 1;
    if (replace) nextDepth = currentDepth;
    if (resetDepth) nextDepth = 0;
    const nextState = {
      ...currentState,
      smileguardPage: nextPage,
      smileguardDepth: nextDepth,
    };

    window.history[replace ? 'replaceState' : 'pushState'](
      nextState,
      document.title,
      window.location.href
    );
    pageRef.current = nextPage;
    setPage(nextPage);
  }, []);

  const goBack = useCallback((fallbackPage = 'home') => {
    const depth = Number(window.history.state?.smileguardDepth) || 0;
    if (depth > 0) {
      window.history.back();
      return;
    }
    navigate(fallbackPage, { replace: true });
  }, [navigate]);

  const openMonthlyReport = useCallback((month) => {
    setMonthlyReportMonth(month || null);
    navigate('monthly-report');
  }, [navigate]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const currentState = window.history.state || {};
    window.history.replaceState(
      {
        ...currentState,
        smileguardPage: pageRef.current,
        smileguardDepth: Number(currentState.smileguardDepth) || 0,
      },
      document.title,
      window.location.href
    );

    const handlePopState = (event) => {
      const nextPage = event.state?.smileguardPage;
      if (nextPage) {
        pageRef.current = nextPage;
        setPage(nextPage);
        return;
      }

      const fallbackPage = sessionRef.current ? 'home' : 'login';
      window.history.replaceState(
        { smileguardPage: fallbackPage, smileguardDepth: 0 },
        document.title,
        window.location.href
      );
      pageRef.current = fallbackPage;
      setPage(fallbackPage);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const scrollContainer = document.querySelector('.page-content, .mypage-content, .report-body');
    if (scrollContainer) scrollContainer.scrollTop = 0;
  }, [page]);

  const handleSelectChild = useCallback((childId) => {
    const nextId = childId == null ? null : Number(childId);
    setSelectedChildId(nextId);
    if (nextId == null) localStorage.removeItem('smileguard-selected-child');
    else localStorage.setItem('smileguard-selected-child', String(nextId));
  }, []);

  const handleCapture = useCallback((analysisBlob, originalBlob = analysisBlob) => {
    setCapturedUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(analysisBlob);
    });
    capturedOriginalBlobRef.current = originalBlob;
    setCapturedBlob(analysisBlob);
    setAnalysisResult(null);
  }, []);

  const handleLogin = ({ user, accessToken, provider, remember }) => {
    const storage = remember ? localStorage : sessionStorage;
    const nextSession = {
      user,
      accessToken,
      provider,
    };
    localStorage.removeItem('smileguard-session');
    sessionStorage.removeItem('smileguard-session');
    storage.setItem('smileguard-session', JSON.stringify(nextSession));
    setSession(nextSession);
    navigate('home', { replace: true, resetDepth: true });
  };

  const handleLogout = () => {
    localStorage.removeItem('smileguard-session');
    sessionStorage.removeItem('smileguard-session');
    setSession(null);
    navigate('login', { replace: true, resetDepth: true });
  };

  const handleUserUpdate = (user) => {
    setSession((current) => {
      if (!current) return current;
      const nextSession = { ...current, user };
      const storage = localStorage.getItem('smileguard-session') ? localStorage : sessionStorage;
      storage.setItem('smileguard-session', JSON.stringify(nextSession));
      return nextSession;
    });
  };

  const pages = {
    login: <LoginPage onLogin={handleLogin} onNavigate={navigate} />,
    signup: <SignUpPage onNavigate={navigate} />,
    'find-id': <FindAccountPage onNavigate={navigate} onBack={() => goBack('login')} initialTab="id" />,
    'find-password': <FindAccountPage onNavigate={navigate} onBack={() => goBack('login')} initialTab="password" />,
    'reset-password': <ResetPasswordPage onNavigate={navigate} token={resetToken} />,
    home: <MainPage onNavigate={navigate} user={session?.user} token={session?.accessToken} selectedChildId={selectedChildId} onSelectChild={handleSelectChild} />,
    mypage: <MyPage onNavigate={navigate} onBack={() => goBack('home')} user={session?.user} provider={session?.provider} token={session?.accessToken} selectedChildId={selectedChildId} onLogout={handleLogout} />,
    history: <HistoryPage onNavigate={navigate} onBack={() => goBack('mypage')} token={session?.accessToken} selectedChildId={selectedChildId} onSelectChild={handleSelectChild} />,
    notification: <NotificationPage onNavigate={navigate} onBack={() => goBack('mypage')} onOpenMonthlyReport={openMonthlyReport} user={session?.user} token={session?.accessToken} selectedChildId={selectedChildId} />,
    profile: <ProfilePage onNavigate={navigate} onBack={() => goBack('mypage')} user={session?.user} provider={session?.provider} token={session?.accessToken} onUserUpdate={handleUserUpdate} />,
    'child-profile': <ChildProfilePage onNavigate={navigate} onBack={() => goBack('mypage')} token={session?.accessToken} selectedChildId={selectedChildId} onSelectChild={handleSelectChild} />,
    'care-guide': <CareGuidePage onNavigate={navigate} onBack={() => goBack('home')} />,
    'pre-capture': <PreCapturePage onNavigate={navigate} onBack={() => goBack('home')} token={session?.accessToken} selectedChildId={selectedChildId} />,
    camera: <CameraPage onNavigate={navigate} onBack={() => goBack('home')} onCapture={handleCapture} token={session?.accessToken} selectedChildId={selectedChildId} />,
    preview: <CapturePreviewPage onNavigate={navigate} onBack={() => goBack('camera')} capturedUrl={capturedUrl} />,
    analyzing: (
      <AnalyzingPage
        onNavigate={navigate}
        capturedBlob={capturedBlob}
        token={session?.accessToken}
        selectedChildId={selectedChildId}
        onAnalysisComplete={setAnalysisResult}
      />
    ),
    result: <ResultPage onNavigate={navigate} analysisResult={analysisResult} capturedUrl={capturedUrl} />,
    report: <ReportPage onNavigate={navigate} onBack={() => goBack('home')} token={session?.accessToken} selectedChildId={selectedChildId} />,
    'monthly-report': <MonthlyReportPage onNavigate={navigate} onBack={() => goBack('notification')} token={session?.accessToken} selectedChildId={selectedChildId} reportMonth={monthlyReportMonth} />,
  };

  return <main className="app-shell">{pages[page]}</main>;
}

export default App;
