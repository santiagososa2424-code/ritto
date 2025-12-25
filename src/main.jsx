import React from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./AppRouter.jsx";
import { Toaster } from "react-hot-toast";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* 🔔 Toaster GLOBAL (necesario para toast.success / toast.error) */}
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 2500,
        style: {
          background: "#020617",
          color: "#e5e7eb",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(8px)",
        },
      }}
    />

    <AppRouter />
  </React.StrictMode>
);
