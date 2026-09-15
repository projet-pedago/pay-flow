import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { Layout } from "@/components/layout";
import { DashboardPage } from "@/pages/dashboard";
import { DepartmentsPage } from "@/pages/departments";
import { EmployeeDetailPage } from "@/pages/employee-detail";
import { EmployeesPage } from "@/pages/employees";
import { PayrollPage } from "@/pages/payroll";
import { PayslipPage } from "@/pages/payslip";
import { PeriodDetailPage } from "@/pages/period-detail";
import { SettingsPage } from "@/pages/settings";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/employes" element={<EmployeesPage />} />
          <Route path="/employes/:id" element={<EmployeeDetailPage />} />
          <Route path="/departements" element={<DepartmentsPage />} />
          <Route path="/paie" element={<PayrollPage />} />
          <Route path="/paie/:id" element={<PeriodDetailPage />} />
          <Route path="/bulletins/:id" element={<PayslipPage />} />
          <Route path="/parametres" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  );
}
