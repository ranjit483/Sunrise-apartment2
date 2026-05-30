'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  Home,
  Users,
  FileText,
  CreditCard,
  Wrench,
  UserCheck,
  UsersRound,
  Bell,
  Car,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Wallet,
  BookOpen,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { RoleHierarchy } from '@/lib/rbac'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  roles?: string[]
  excludeRoles?: string[]
  includeRoles?: string[]
  minClearance?: number
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'User Approvals', href: '/admin-approve', icon: UserPlus, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { title: 'Buildings', href: '/buildings', icon: Building2, minClearance: 3 },
  { title: 'Units', href: '/units', icon: Home, minClearance: 4, excludeRoles: ['RESIDENT', 'TENANT'] },
  { title: 'Leases', href: '/leases', icon: FileText, minClearance: 4, excludeRoles: ['RESIDENT', 'TENANT'] },
  { title: 'Users', href: '/users', icon: Users, minClearance: 3 },
  { title: 'Chart of Accounts', href: '/accounts/chart', icon: Wallet, minClearance: 3, excludeRoles: ['MANAGER', 'ACCOUNTANT', 'RESIDENT', 'TENANT', 'GUARD', 'OFFICE_ASSISTANT'] },
  { title: 'Resident/Tenant Ledger', href: '/accounts/ledger', icon: BookOpen, minClearance: 3, excludeRoles: ['RESIDENT', 'TENANT', 'GUARD', 'OFFICE_ASSISTANT'] },
  { title: 'Invoices', href: '/invoices', icon: FileText, minClearance: 4, excludeRoles: ['RESIDENT', 'TENANT'] },
  { title: 'Payments', href: '/payments', icon: CreditCard, minClearance: 4 },
  { title: 'Expenses', href: '/expenses', icon: CreditCard, minClearance: 3, excludeRoles: ['OFFICE_ASSISTANT'] },
  { title: 'Maintenance', href: '/maintenance', icon: Wrench, excludeRoles: ['GUARD'] },
  { title: 'Staff', href: '/staff', icon: UserCheck, minClearance: 3 },
  { title: 'Visitors', href: '/visitors', icon: UsersRound, minClearance: 5, includeRoles: ['GUARD'] },
  { title: 'Complaints', href: '/complaints', icon: Bell },
  { title: 'Parking', href: '/parking', icon: Car, minClearance: 5, includeRoles: ['GUARD'] },
  { title: 'Reports', href: '/reports', icon: BarChart3, minClearance: 2 },
  { title: 'Profile', href: '/profile', icon: UserCheck },
  { title: 'SLA Policy', href: '/sla', icon: FileText },
  { title: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
  collapsed?: boolean
  setCollapsed?: (val: boolean) => void
  mobileOpen?: boolean
  setMobileOpen?: (val: boolean) => void
}

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname()
  const { profile } = useAuth()

  const userClearance = profile ? profile.clearance_level : 7
  const userRole = profile ? profile.role : 'TENANT'

  const filteredNavItems = navItems.filter(item => {
    if (item.roles && !item.roles.includes(userRole)) return false;
    if (item.excludeRoles && item.excludeRoles.includes(userRole)) return false;
    
    if (item.minClearance && userClearance > item.minClearance) {
      if (item.includeRoles && item.includeRoles.includes(userRole)) {
        return true;
      }
      return false;
    }
    return true;
  })

  return (
    <>
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 lg:hidden" 
          onClick={() => setMobileOpen?.(false)}
        />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-white border-r transition-all duration-300 lg:translate-x-0',
          collapsed ? 'w-20' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b px-4">
            {!collapsed && (
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg text-foreground">Sunrise</span>
              </Link>
            )}
            <button
              onClick={() => setCollapsed?.(!collapsed)}
              className="rounded-lg p-1.5 hover:bg-muted hidden lg:block"
            >
              {collapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              {filteredNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen?.(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <item.icon className={cn('h-5 w-5', collapsed && 'mx-auto')} />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="border-t p-4">
            {!collapsed && (
              <div className="text-xs text-muted-foreground">
                <p>Sunrise Apartment</p>
                <p>Nakhhu-13, Lalitpur</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}