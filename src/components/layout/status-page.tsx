import type { ReactNode } from 'react'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'

export function StatusPage({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-svh max-w-[1440px] flex-col gap-8 px-4 py-6 sm:px-8 xl:px-[120px]">
      <SiteHeader />
      <main id="conteudo" tabIndex={-1} className="flex flex-1 flex-col items-start justify-center gap-6 py-24 outline-none">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="max-w-prose text-muted-foreground">{description}</p>
        {children}
      </main>
      <SiteFooter className="mt-16" />
    </div>
  )
}
