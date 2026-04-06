"use client"

import * as React from "react"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { LanguageProvider } from "@/components/providers/language-provider"
import { BranchProvider } from "@/components/providers/branch-provider"
import { GlobalClientComponents } from "@/components/providers/global-client-components"

interface ClientProvidersProps {
  children: React.ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ErrorBoundary>
        <LanguageProvider>
          <BranchProvider>
            {children}
          </BranchProvider>
          <GlobalClientComponents />
        </LanguageProvider>
      </ErrorBoundary>
    </ThemeProvider>
  )
}
