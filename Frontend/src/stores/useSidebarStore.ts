import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface SidebarState {
  /** Barra lateral recolhida no desktop (lembrada entre sessões) */
  collapsed: boolean
  /** Gaveta aberta no celular/tablet */
  mobileOpen: boolean
  toggleCollapsed: () => void
  setMobileOpen: (open: boolean) => void
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    set => ({
      collapsed: false,
      mobileOpen: false,
      toggleCollapsed: () => set(s => ({ collapsed: !s.collapsed })),
      setMobileOpen: open => set({ mobileOpen: open }),
    }),
    {
      name: 'sidebar-state',
      storage: createJSONStorage(() => localStorage),
      partialize: s => ({ collapsed: s.collapsed }),
    }
  )
)
