import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { EmployeeLayout } from "@/components/employee-layout";
import { GuestOnly, HomeRedirect, RequireAuth } from "@/components/guards";
import { AdminLayout } from "@/components/layout";
import { AuthProvider } from "@/lib/auth";
import { DashboardPage } from "@/pages/dashboard";
import { DepartmentsPage } from "@/pages/departments";
import { EmployeeDetailPage } from "@/pages/employee-detail";
import { EmployeeHomePage } from "@/pages/employee-home";
import { EmployeePayslipsPage } from "@/pages/employee-payslips";
import { EmployeeProfilePage } from "@/pages/employee-profile";
import { EmployeesPage } from "@/pages/employees";
import { LoginPage } from "@/pages/login";
import { PayrollPage } from "@/pages/payroll";
import { PayslipPage } from "@/pages/payslip";
import { PeriodDetailPage } from "@/pages/period-detail";
import { SettingsPage } from "@/pages/settings";
import type { ReactNode } from "react";

function AdminShell({ children }: { children: ReactNode }) {
  return (
    <RequireAuth role="admin">
      <AdminLayout>{children}</AdminLayout>
    </RequireAuth>
  );
}

function EmployeeShell({ children }: { children: ReactNode }) {
  return (
    <RequireAuth role="employee">
      <EmployeeLayout>{children}</EmployeeLayout>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route
            path="/login"
            element={
              <GuestOnly>
                <LoginPage />
              </GuestOnly>
            }
          />
          <Route path="/admin" element={<AdminShell><DashboardPage /></AdminShell>} />
          <Route path="/admin/employes" element={<AdminShell><EmployeesPage /></AdminShell>} />
          <Route path="/admin/employes/:id" element={<AdminShell><EmployeeDetailPage /></AdminShell>} />
          <Route path="/admin/departements" element={<AdminShell><DepartmentsPage /></AdminShell>} />
          <Route path="/admin/paie" element={<AdminShell><PayrollPage /></AdminShell>} />
          <Route path="/admin/paie/:id" element={<AdminShell><PeriodDetailPage /></AdminShell>} />
          <Route path="/admin/bulletins/:id" element={<AdminShell><PayslipPage /></AdminShell>} />
          <Route path="/admin/parametres" element={<AdminShell><SettingsPage /></AdminShell>} />
          <Route path="/espace" element={<EmployeeShell><EmployeeHomePage /></EmployeeShell>} />
          <Route path="/espace/bulletins" element={<EmployeeShell><EmployeePayslipsPage /></EmployeeShell>} />
          <Route path="/espace/bulletins/:id" element={<EmployeeShell><PayslipPage /></EmployeeShell>} />
          <Route path="/espace/profil" element={<EmployeeShell><EmployeeProfilePage /></EmployeeShell>} />
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}
