"use client"

import * as React from "react"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { LanguageProvider } from "@/components/providers/language-provider"
import { BranchProvider } from "@/components/providers/branch-provider"
import { CustomerProvider } from "@/components/providers/customer-provider"
import { GlobalClientComponents } from "@/components/providers/global-client-components"
import { UserPresenceFetcher } from "@/components/providers/user-presence-fetcher"
import { NotificationSoundProvider } from "@/components/providers/notification-sound-provider"
import { IdleProvider } from "@/components/providers/idle-provider"

interface ClientProvidersProps {
  children: React.ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  React.useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "development") {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().then((success) => {
              if (success) {
                console.log("[PWA] Unregistered service worker in development mode");
                window.location.reload();
              }
            });
          }
        });
      }
    }
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ErrorBoundary>
        <NotificationSoundProvider />
        <IdleProvider>
          <LanguageProvider>
            <BranchProvider>
              <CustomerProvider>
                <UserPresenceFetcher>
                  {children}
                </UserPresenceFetcher>
              </CustomerProvider>
            </BranchProvider>
            <GlobalClientComponents />
          </LanguageProvider>
        </IdleProvider>
      </ErrorBoundary>
    </ThemeProvider>
  )
}
