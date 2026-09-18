import { AssistantDock } from "@/components/assistant-dock";
import { EmployeeLayout } from "@/components/employee-layout";
import { GuestOnly, HomeRedirect, RequireAuth } from "@/components/guards";
import { AdminLayout } from "@/components/layout";
import { MicrosoftSessionBridge } from "@/components/microsoft-session";
import { AuthProvider } from "@/lib/auth";
import { AssistantPage } from "@/pages/assistant";
import { AttestationPage } from "@/pages/attestation";
import { DashboardPage } from "@/pages/dashboard";
import { DepartmentsPage } from "@/pages/departments";
import { EmployeeDetailPage } from "@/pages/employee-detail";
import { EmployeeHomePage } from "@/pages/employee-home";
import { EmployeePayslipsPage } from "@/pages/employee-payslips";
import { EmployeeProfilePage } from "@/pages/employee-profile";
import { EmployeeRequestsPage } from "@/pages/employee-requests";
import { EmployeesPage } from "@/pages/employees";
import { AdvancesPage } from "@/pages/advances";
import { DocumentsPage } from "@/pages/documents";
import { LeavesPage } from "@/pages/leaves";
import { LoginPage } from "@/pages/login";
import { PayrollPage } from "@/pages/payroll";
import { PayslipCalcPage } from "@/pages/payslip-calc";
import { NetworkPage } from "@/pages/network";
import { PayslipPage } from "@/pages/payslip";
import { PeriodDetailPage } from "@/pages/period-detail";
import { SettingsPage } from "@/pages/settings";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import type { ReactNode } from "react";

function AdminShell({ children }: { children: ReactNode }) {
  return (
    <RequireAuth role="admin">
      <AdminLayout>{children}</AdminLayout>
    </RequireAuth>
  );
}

function HrShell({ children }: { children: ReactNode }) {
  return (
    <RequireAuth role="hr">
      <AdminLayout variant="hr">{children}</AdminLayout>
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
        <MicrosoftSessionBridge />
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
          <Route path="/admin/calcul" element={<AdminShell><PayslipCalcPage /></AdminShell>} />
          <Route path="/admin/assistant" element={<AdminShell><AssistantPage /></AdminShell>} />
          <Route path="/admin/reseau" element={<AdminShell><NetworkPage /></AdminShell>} />
          <Route path="/admin/paie/:id" element={<AdminShell><PeriodDetailPage /></AdminShell>} />
          <Route path="/admin/bulletins/:id" element={<AdminShell><PayslipPage /></AdminShell>} />
          <Route path="/admin/conges" element={<AdminShell><LeavesPage /></AdminShell>} />
          <Route path="/admin/acomptes" element={<AdminShell><AdvancesPage /></AdminShell>} />
          <Route path="/admin/dossiers" element={<AdminShell><DocumentsPage /></AdminShell>} />
          <Route path="/admin/attestations/:employeeId/:kind" element={<AdminShell><AttestationPage /></AdminShell>} />
          <Route path="/admin/parametres" element={<AdminShell><SettingsPage /></AdminShell>} />
          <Route path="/rh" element={<HrShell><EmployeesPage /></HrShell>} />
          <Route path="/rh/employes" element={<HrShell><EmployeesPage /></HrShell>} />
          <Route path="/rh/employes/:id" element={<HrShell><EmployeeDetailPage /></HrShell>} />
          <Route path="/rh/departements" element={<HrShell><DepartmentsPage /></HrShell>} />
          <Route path="/rh/conges" element={<HrShell><LeavesPage /></HrShell>} />
          <Route path="/rh/acomptes" element={<HrShell><AdvancesPage /></HrShell>} />
          <Route path="/rh/dossiers" element={<HrShell><DocumentsPage /></HrShell>} />
          <Route path="/rh/attestations/:employeeId/:kind" element={<HrShell><AttestationPage /></HrShell>} />
          <Route path="/rh/assistant" element={<HrShell><AssistantPage /></HrShell>} />
          <Route path="/espace" element={<EmployeeShell><EmployeeHomePage /></EmployeeShell>} />
          <Route path="/espace/bulletins" element={<EmployeeShell><EmployeePayslipsPage /></EmployeeShell>} />
          <Route path="/espace/bulletins/:id" element={<EmployeeShell><PayslipPage /></EmployeeShell>} />
          <Route path="/espace/conges" element={<EmployeeShell><LeavesPage /></EmployeeShell>} />
          <Route path="/espace/demandes" element={<EmployeeShell><EmployeeRequestsPage /></EmployeeShell>} />
          <Route path="/espace/acomptes" element={<EmployeeShell><AdvancesPage /></EmployeeShell>} />
          <Route path="/espace/dossier" element={<EmployeeShell><DocumentsPage /></EmployeeShell>} />
          <Route path="/espace/attestations/:kind" element={<EmployeeShell><AttestationPage /></EmployeeShell>} />
          <Route path="/espace/assistant" element={<EmployeeShell><AssistantPage /></EmployeeShell>} />
          <Route path="/espace/profil" element={<EmployeeShell><EmployeeProfilePage /></EmployeeShell>} />
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
        <AssistantDock />
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}
