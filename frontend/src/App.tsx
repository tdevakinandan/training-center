import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Tables from "./pages/Tables";
import Calendar from "./pages/Calendar";
import NotFound from "./pages/NotFound";
import Leads from "./pages/Leads";
import ApplicationForm from "./pages/ApplicationForm";
import Employee from "./pages/Employee";
import Settings from "./pages/Settings"; // ✅ added

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Application Form (NO DashboardLayout) */}
          <Route path="/application" element={<ApplicationForm />} />

          {/* Dashboard Routes with Layout */}
          <Route element={<DashboardLayout />}>
            <Route path="/Dashboard" element={<Dashboard />} />
            <Route path="/tables" element={<Tables />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/" element={<Leads />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/employee" element={<Employee />} /> 
              <Route path="/settings" element={<Settings />} /> {/* ✅ added */}
            {/* Students pages (still accessible even if not in Sidebar) */}
        
          </Route>

          {/* 404 Page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
