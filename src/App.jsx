import { Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Dashboard from './features/dashboard/Dashboard';
import HabitTracker from './features/habits/HabitTracker';
import DeveloperHub from './features/developer-hub/DeveloperHub';
import GoalsList from './features/goals/GoalsList';
import GoalDetail from './features/goals/GoalDetail';

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/habits" element={<HabitTracker />} />
        <Route path="/developer-hub" element={<DeveloperHub />} />
        <Route path="/goals" element={<GoalsList />} />
        <Route path="/goals/:id" element={<GoalDetail />} />
      </Routes>
    </AppLayout>
  );
}
