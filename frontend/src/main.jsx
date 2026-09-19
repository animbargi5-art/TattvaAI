import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrimeReactProvider } from "primereact/api";

// Import organized stylesheet
import "./styles/index.css";

// Import interceptors to initialize global error handling
import "./api/interceptors.js";

import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { primeReactConfig } from "./config/primeReactConfig.js";

// Create QueryClient instance for TanStack Query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            refetchOnWindowFocus: false,
        },
        mutations: {
            retry: 1,
        },
    },
});

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <PrimeReactProvider value={primeReactConfig}>
                <BrowserRouter>
                    <AuthProvider>
                        <App />
                    </AuthProvider>
                </BrowserRouter>
            </PrimeReactProvider>
        </QueryClientProvider>
    </StrictMode>
);