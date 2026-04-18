import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PrivateRoute } from "@/components/auth/PrivateRoute";
import { PublicRoute } from "@/components/auth/PublicRoute";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import NotFound from "./pages/NotFound";
import AppShell from "./components/layout/AppShell";
import DashboardHome from "./pages/dashboard/DashboardHome";
import Clients from "./pages/dashboard/Clients";
import Contacts from "./pages/dashboard/Contacts";
import ClientDetails from "./pages/dashboard/ClientDetails";
import Conversations from "./pages/dashboard/Conversations";
import Reports from "./pages/dashboard/Reports";
import Agenda from "./pages/dashboard/Agenda";
import Launchpad from "./pages/dashboard/Launchpad";
import Agents from "./pages/dashboard/Agents";
import SettingsPage from "./pages/dashboard/SettingsPage";
import UsersManagement from "./pages/dashboard/UsersManagement";
import InstanceList from "./pages/dashboard/Whatsapp/InstanceList";
import ChatInterface from "./pages/dashboard/Whatsapp/ChatInterface";
import Automation from "./pages/dashboard/Automation";
import FlowEditor from "./pages/dashboard/FlowEditor";
import SupportPage from "./pages/dashboard/SupportPage";
import TicketDetail from "./pages/dashboard/TicketDetail";
import AdminSupportPage from "./pages/dashboard/AdminSupportPage";
import { SuperAdminGuard } from "./components/auth/SuperAdminGuard";

import InstagramAdmin from "./pages/dashboard/Instagram/InstagramAdmin";
import InstagramChat from "./pages/dashboard/Instagram/InstagramChat";
import OnboardingPage from "./pages/onboarding/OnboardingPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/home" element={<Index />} />
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/signup" element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            } />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Onboarding Route - Requires Login but NOT Company */}
            <Route path="/onboarding" element={
              <PrivateRoute requiresCompany={false}>
                <OnboardingPage />
              </PrivateRoute>
            } />

            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <AppShell />
                </PrivateRoute>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="clients" element={<Clients />} />
              <Route path="contacts" element={<Contacts />} />
              <Route path=":leadId" element={<ClientDetails />} />
              <Route path="conversations" element={<Conversations />} />
              <Route path="reports" element={<Reports />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="launchpad" element={<Launchpad />} />
              <Route path="agents" element={<Agents />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="users" element={<UsersManagement />} />
              <Route path="whatsapp/instances" element={<InstanceList />} />
              <Route path="whatsapp/chat" element={<ChatInterface />} />
              <Route path="instagram" element={<InstagramChat />} />
              <Route path="instagram/admin" element={<InstagramAdmin />} />
              <Route path="automation" element={<Automation />} />
              <Route path="automation/:flowId" element={<FlowEditor />} />
              <Route path="support" element={<SupportPage />} />
              <Route path="support/admin" element={<SuperAdminGuard><AdminSupportPage /></SuperAdminGuard>} />
              <Route path="support/:ticketId" element={<TicketDetail />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
