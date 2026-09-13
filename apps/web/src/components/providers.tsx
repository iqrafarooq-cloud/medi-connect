"use client";

import { useEffect, useState } from "react";
import { Toaster } from "@medi-connect/ui/components/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { queryClient } from "@/utils/orpc";

import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [devtoolsReady, setDevtoolsReady] = useState(false);

  useEffect(() => {
    setDevtoolsReady(true);
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        {children}
        {devtoolsReady ? <ReactQueryDevtools initialIsOpen={false} /> : null}
      </QueryClientProvider>
      <Toaster richColors theme="light" />
    </ThemeProvider>
  );
}
