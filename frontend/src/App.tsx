import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import IncomePage from './pages/IncomePage';
import ExpensesPage from './pages/ExpensesPage';
import LoansPage from './pages/LoansPage';
import InvestmentsPage from './pages/InvestmentsPage';
import SavingsPage from './pages/SavingsPage';
import DataManagementPage from './pages/DataManagementPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="income" element={<IncomePage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="loans" element={<LoansPage />} />
        <Route path="investments" element={<InvestmentsPage />} />
        <Route path="savings" element={<SavingsPage />} />
        <Route path="data" element={<DataManagementPage />} />
      </Route>
    </Routes>
  );
}
