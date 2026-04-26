import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import IncomePage from './pages/IncomePage';
import ExpensesPage from './pages/ExpensesPage';
import LoansPage from './pages/LoansPage';
import InvestmentsPage from './pages/InvestmentsPage';
import SavingsPage from './pages/SavingsPage';
import SettingsPage from './pages/SettingsPage';
import DataManagementPage from './pages/DataManagementPage';
import SignUpPage from './pages/SignUpPage';
import SignInPage from './pages/SignInPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Auth Routes */}
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/signin" element={<SignInPage />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="income" element={<IncomePage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="loans" element={<LoansPage />} />
          <Route path="investments" element={<InvestmentsPage />} />
          <Route path="savings" element={<SavingsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="data" element={<DataManagementPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
