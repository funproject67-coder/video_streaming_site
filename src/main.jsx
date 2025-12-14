import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { injectSpeedInsights } from "@vercel/speed-insights";
import { inject } from "@vercel/analytics";

// Initialize Vercel Speed Insights
injectSpeedInsights();

// Initialize Vercel Web Analytics
inject();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
