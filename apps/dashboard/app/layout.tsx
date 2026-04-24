import { Geist, Geist_Mono } from "next/font/google"

import { DashboardShell } from "@/components/dashboard-shell"
import { ThemeProvider } from "@/components/theme-provider"
import "@workspace/ui/globals.css"
import { cn } from "@workspace/ui/lib/utils"
import { TooltipProvider } from "@workspace/ui/components/tooltip"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("dark antialiased font-sans", geist.variable, fontMono.variable)}
    >
      <body>
        <ThemeProvider>
					<TooltipProvider>
          <DashboardShell>{children}</DashboardShell>
					</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
