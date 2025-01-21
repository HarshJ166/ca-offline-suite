import React, { useEffect } from "react";
import "./App.css";
import Dashboard from "./Pages/Home";
import { ThemeProvider } from "./components/theme-provider";
import { HashRouter, Routes, Route } from "react-router-dom";
import CaseDashboard from "./Pages/CaseDashboard";
import IndividualDashboard from "./Pages/IndividualDashboard";
import ElectronIntro from "./components/ElectronIntro";
import { useState } from "react";
import { SidebarProvider } from "./components/ui/sidebar";
import { BreadcrumbProvider } from "./contexts/BreadcrumbContext";
// import { PrivateRoute } from "./components/PrivateRoute";
// import Login from "./components/Authentication/Login";

function App() {
  const [showIntro, setShowIntro] = useState(true);

  return (
    <ThemeProvider defaultTheme="system" storageKey="app-theme">
      {showIntro && <ElectronIntro onComplete={() => setShowIntro(false)} />}
      <SidebarProvider>
        <HashRouter>
          <BreadcrumbProvider>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/:defaultTab" element={<Dashboard />} />
              <Route
                path="/case-dashboard/:caseId/:defaultTab"
                element={<IndividualDashboard />}
              />
              <Route
                path="/individual-dashboard/:caseId/:individualId/:defaultTab"
                element={<IndividualDashboard />}
              />
              <Route
                path="/individual-dashboard/:caseId/:defaultTab"
                element={<IndividualDashboard />}
              />
            </Routes>

            {/* <Routes>
              Public route
              <Route path="/login" element={<Login />} />

              Protected routes
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/:defaultTab"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/case-dashboard/:caseId/:defaultTab"
                element={
                  <PrivateRoute>
                    <CaseDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/individual-dashboard/:caseId/:individualId/:defaultTab"
                element={
                  <PrivateRoute>
                    <IndividualDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/individual-dashboard/:caseId/:defaultTab"
                element={
                  <PrivateRoute>
                    <IndividualDashboard />
                  </PrivateRoute>
                }
              />
            </Routes> */}
          </BreadcrumbProvider>
        </HashRouter>
      </SidebarProvider>
    </ThemeProvider>
  );
}

export default App;
