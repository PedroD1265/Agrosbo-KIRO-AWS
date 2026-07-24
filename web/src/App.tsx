import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppLayout } from '@/app-shell/AppLayout';
import { ThemeProvider } from '@/components/ThemeProvider';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/lib/auth';
import { RequireAuth } from '@/lib/RequireAuth';
import Today from './pages/Today';
import MapPage from './pages/Map';
import Blocks from './pages/Blocks';
import BlockDetail from './pages/BlockDetail';
import Greenhouses from './pages/Greenhouses';
import GreenhouseDetail from './pages/GreenhouseDetail';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import Applications from './pages/Applications';
import Beekeeping from './pages/Beekeeping';
import Irrigation from './pages/Irrigation';
import Tasks from './pages/Tasks';
import Observations from './pages/Observations';
import Inventory from './pages/Inventory';
import Harvest from './pages/Harvest';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Integrations from './pages/Integrations';
import Settings from './pages/Settings';
import More from './pages/More';
import NotFound from './pages/NotFound';
import Login from './pages/Login';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/today" replace />} />
              <Route
                element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                }
              >
                <Route path="/today" element={<Today />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/blocks" element={<Blocks />} />
                <Route path="/blocks/:id" element={<BlockDetail />} />
                <Route path="/greenhouses" element={<Greenhouses />} />
                <Route path="/greenhouses/:id" element={<GreenhouseDetail />} />
                <Route path="/campaigns" element={<Campaigns />} />
                <Route path="/campaigns/:id" element={<CampaignDetail />} />
                <Route path="/applications" element={<Applications />} />
                <Route path="/beekeeping" element={<Beekeeping />} />
                <Route path="/irrigation" element={<Irrigation />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/observations" element={<Observations />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/harvest" element={<Harvest />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/integrations" element={<Integrations />} />
                <Route
                  path="/settings"
                  element={
                    <RequireAuth roles={['admin']}>
                      <Settings />
                    </RequireAuth>
                  }
                />
                <Route path="/more" element={<More />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
