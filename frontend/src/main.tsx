import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./state/useAuth";
import { bootstrapAnalytics } from "./lib/analyticsBootstrap";
import "./styles/v3.css";

// isInstrumentationEnabled() 결과를 createAnalyticsWrapper 에 주입해 래퍼를 초기화한다.
// PROD 빌드 + emulator/E2E 없음 → GA4 활성. 그 외 → no-op.
bootstrapAnalytics();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
