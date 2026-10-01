import { getLanguage } from "./i18n/language";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./state/useAuth";
import "./styles/v3.css";
import "./styles/mobile.css";
import "./styles/prereq.css";
import "./styles/ask-routing.css";
import "./styles/roadmap.css";
import "katex/dist/katex.min.css";

document.documentElement.lang = getLanguage();
document.title = getLanguage() === "en" ? "Socratic - Learn through questions" : "Socratic - 소크라테스식 학습";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
