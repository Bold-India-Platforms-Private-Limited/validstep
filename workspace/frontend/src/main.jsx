import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { store } from "./app/store.js";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      {/* BASE_URL is "/" in dev, "/workspace/" in the production build (see vite.config.js) */}
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
        <Toaster position="top-center" toastOptions={{ duration: 2500 }} />
      </BrowserRouter>
    </Provider>
  </StrictMode>
);
