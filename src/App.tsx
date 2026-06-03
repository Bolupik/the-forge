import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StacksAuthProvider } from "@/contexts/StacksAuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Admin from "./pages/Admin.tsx";
import Auth from "./pages/Auth.tsx";
import Account from "./pages/Account.tsx";
import Gallery from "./pages/Gallery.tsx";
import Mint from "./pages/Mint.tsx";
import Trading from "./pages/Trading.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <StacksAuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/gallery"
              element={
                <ProtectedRoute>
                  <Gallery />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mint"
              element={
                <ProtectedRoute>
                  <Mint />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trading"
              element={
                <ProtectedRoute>
                  <Trading />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              }
            />
            <Route path="/admin" element={<Admin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </StacksAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
