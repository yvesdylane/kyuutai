import type { ReactNode } from "react"
import { LeftBrandPanel } from "./left-brand-panel"

export function SplitAuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface-container-low lg:flex-row">
      <div className="hidden h-[35vh] md:block md:h-[40vh] lg:h-dvh lg:w-[58%]">
        <LeftBrandPanel />
      </div>
      <div className="flex w-full flex-1 items-center justify-center bg-surface-container-low lg:w-[42%] lg:flex-none">
        {children}
      </div>
    </div>
  )
}
