import type { ReactNode } from "react"

import { Container } from "@/components/shared/container"
import { PageBand } from "@/components/shared/page-band"

/** Sign-in, registration and password pages: the inside-page band over one centred card (as Contact). */
export function AuthCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="bg-surface">
      <PageBand description={description}>{title}</PageBand>
      <Container className="flex justify-center pt-10 pb-20 md:pt-16 md:pb-28">
        <div className="w-full max-w-160 rounded-panel bg-background p-5 shadow-card-lift md:p-10">{children}</div>
      </Container>
    </div>
  )
}
