import { Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Dashboard from './features/dashboard/Dashboard';
import HabitTracker from './features/habits/HabitTracker';

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/habits" element={<HabitTracker />} />
      </Routes>
    </AppLayout>
  );
}
