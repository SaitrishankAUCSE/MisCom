import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import Splash from './pages/Splash';
import Onboarding1 from './pages/Onboarding1';
import Onboarding2 from './pages/Onboarding2';
import AuthChoice from './pages/AuthChoice';
import Login from './pages/Login';
import Signup from './pages/Signup';
import OTPVerification from './pages/OTPVerification';
import ForgotPassword from './pages/ForgotPassword';
import ProfileSetup from './pages/ProfileSetup';
import Welcome from './pages/Welcome';
import Home from './pages/Home';
import Chats from './pages/Chats';
import ChatDetail from './pages/ChatDetail';
import VibeRooms from './pages/VibeRooms';
import MemoryTimeline from './pages/MemoryTimeline';
import NukeDatabase from './pages/NukeDatabase';
import Profile from './pages/Profile';
import LiveMusic from './pages/LiveMusic';
import AIInsights from './pages/AIInsights';
import Settings from './pages/Settings';
import ProtectedRooms from './pages/ProtectedRooms';
import RoomChat from './pages/RoomChat';
import Discover from './pages/Discover';
import PostSignupOnboarding from './pages/PostSignupOnboarding';
import Appearance from './pages/Appearance';
import BottomNav from './components/BottomNav';
import { GlobalProvider, useGlobal } from './context/GlobalContext';

// Protected Route — redirects unauthenticated users to /auth-choice
function Protected({ children }) {
  const { isAuthenticated, isAuthLoading } = useGlobal();
  if (isAuthLoading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary-container/30 border-t-primary-container rounded-full animate-spin" /></div>;
  if (!isAuthenticated) return <Navigate to="/auth-choice" replace />;
  return children;
}

// Public Route — redirects authenticated users to /home (or onboarding if newly created)
function PublicOnly({ children }) {
  const { isAuthenticated, isAuthLoading, user } = useGlobal();
  if (isAuthLoading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary-container/30 border-t-primary-container rounded-full animate-spin" /></div>;
  
  if (isAuthenticated) {
    // Redirect to onboarding ONLY if the account was created within the last 15 seconds
    if (user && user.createdAt && (Date.now() - user.createdAt < 15000)) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/home" replace />;
  }
  
  return children;
}

const BOTTOM_NAV_PATHS = ['/home', '/chats', '/discover', '/secret-spaces', '/vibe-rooms', '/memories', '/profile', '/music', '/ai-insights'];

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { globalToast, setGlobalToast } = useGlobal();
  const showBottomNav = BOTTOM_NAV_PATHS.includes(location.pathname);

  return (
    <div className="relative min-h-screen bg-background">
      {/* Global In-App Notification Toast */}
      <AnimatePresence>
        {globalToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-0 left-4 right-4 z-[100] cursor-pointer"
            onClick={() => {
              setGlobalToast(null);
              if (globalToast.link) navigate(globalToast.link);
            }}
          >
            <div className="bg-surface-container-high/90 backdrop-blur-xl border border-on-background/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-variant ring-2 ring-primary-container/20 shrink-0">
                {globalToast.avatar ? (
                  <img src={globalToast.avatar} alt="Sender" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-secondary text-xl">person</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-label-bold text-[15px] text-on-surface truncate">{globalToast.title}</h4>
                <p className="font-body-sm text-[13px] text-on-surface-variant truncate mt-0.5">{globalToast.body}</p>
              </div>
              <div className="shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary-container animate-pulse">new_releases</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public */}
          <Route path="/" element={<Splash />} />
          <Route path="/onboarding-1" element={<PublicOnly><Onboarding1 /></PublicOnly>} />
          <Route path="/onboarding-2" element={<PublicOnly><Onboarding2 /></PublicOnly>} />
          <Route path="/auth-choice" element={<PublicOnly><AuthChoice /></PublicOnly>} />
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
          <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
          <Route path="/otp" element={<PublicOnly><OTPVerification /></PublicOnly>} />
          <Route path="/profile-setup" element={<Protected><ProfileSetup /></Protected>} />
          <Route path="/welcome" element={<Protected><Welcome /></Protected>} />

          {/* Protected */}
          <Route path="/home" element={<Protected><Home /></Protected>} />
          <Route path="/chats" element={<Protected><Chats /></Protected>} />
          <Route path="/chat/:chatId" element={<Protected><ChatDetail /></Protected>} />
          <Route path="/vibe-rooms" element={<Protected><VibeRooms /></Protected>} />
          <Route path="/memories" element={<Protected><MemoryTimeline /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/music" element={<Protected><LiveMusic /></Protected>} />
          <Route path="/ai-insights" element={<Protected><AIInsights /></Protected>} />
          
          {/* Admin Tools */}
          <Route path="/nuke" element={<NukeDatabase />} />
          <Route path="/settings" element={<Protected><Settings /></Protected>} />
          <Route path="/secret-spaces" element={<Protected><ProtectedRooms /></Protected>} />
          <Route path="/room/:roomId" element={<Protected><RoomChat /></Protected>} />
          <Route path="/discover" element={<Protected><Discover /></Protected>} />
          <Route path="/onboarding" element={<Protected><PostSignupOnboarding /></Protected>} />
          <Route path="/appearance" element={<Protected><Appearance /></Protected>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
      {showBottomNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <GlobalProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </GlobalProvider>
  );
}
