import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { api } from './api';
import Layout from './components/Layout';
import Login from './screens/Login';
import InstanceSelect from './screens/InstanceSelect';
import Dashboard from './screens/Dashboard';
import Instances from './screens/Instances';
import Scenarios from './screens/Scenarios';
import RunConfig from './screens/RunConfig';
import LiveTracking from './screens/LiveTracking';
import RunHistory from './screens/RunHistory';
import RunResults from './screens/RunResults';
import Reports from './screens/Reports';
import Notifications from './screens/Notifications';
import Schedules from './screens/Schedules';
import Defects from './screens/Defects';
import Users from './screens/Users';
import TestData from './screens/TestData';

export default function App() {
  const [user, setUser] = useState(null);
  const [instance, setInstance] = useState(null);
  const [ready, setReady] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('otm_token');
    if (token) {
      api.me().then(u => { if (u.id) setUser(u); }).finally(() => setReady(true));
    } else {
      setReady(true);
    }
    const saved = localStorage.getItem('otm_instance');
    if (saved) { try { setInstance(JSON.parse(saved)); } catch {} }
  }, []);

  function handleLogin(u) { setUser(u); }

  function handleSelectInstance(inst) {
    setInstance(inst);
    localStorage.setItem('otm_instance', JSON.stringify(inst));
  }

  if (!ready) return null;

  const isPublic = ['/login'].includes(location.pathname);

  if (!user && !isPublic) return <Navigate to="/login" replace />;

  if (isPublic) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout user={user} instance={instance}>
      <Routes>
        <Route path="/" element={<Navigate to="/select-instance" replace />} />
        <Route path="/select-instance" element={<InstanceSelect onSelectInstance={handleSelectInstance} />} />
        <Route path="/dashboard"     element={<Dashboard instance={instance} />} />
        <Route path="/instances"     element={<Instances />} />
        <Route path="/scenarios"     element={<Scenarios instance={instance} />} />
        <Route path="/testdata"      element={<TestData instance={instance} />} />
        <Route path="/run"           element={<RunConfig instance={instance} />} />
        <Route path="/tracking"      element={<LiveTracking instance={instance} />} />
        <Route path="/history"       element={<RunHistory />} />
        <Route path="/results/:id"   element={<RunResults />} />
        <Route path="/reports"       element={<Reports instance={instance} />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/schedules"     element={<Schedules />} />
        <Route path="/defects"       element={<Defects />} />
        <Route path="/users"         element={<Users />} />
        <Route path="/login"         element={<Navigate to="/dashboard" replace />} />
        <Route path="*"              element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}
