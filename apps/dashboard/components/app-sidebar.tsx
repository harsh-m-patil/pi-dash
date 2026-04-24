"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  BarChart3,
  Home,
  Layers3,
  ListChecks,
  Wrench,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar"

const navigationItems = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/projects", label: "Projects", icon: Layers3 },
  { href: "/sessions", label: "Sessions", icon: ListChecks },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/conflicts", label: "Conflicts", icon: AlertTriangle },
] as const

export function AppSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.toString()

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Pi Dashboard">
              <Link href={query ? `/?${query}` : "/"}>
                <BarChart3 />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = pathname === item.href
                const href = query ? `${item.href}?${query}` : item.href

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild tooltip={item.label} isActive={isActive}>
                      <Link href={href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <p className="px-2 text-xs text-sidebar-foreground/70">Local-first analytics</p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
