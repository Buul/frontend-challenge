import { createFileRoute } from '@tanstack/react-router'
import { MobileTabBar, MOBILE_TAB_BAR_HEIGHT } from '@/components/layout/mobile-tab-bar'
import { PageShell } from '@/components/layout/page-shell'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { ProfileScreen } from '@/components/profile/profile-screen'
import { useIsMobile } from '@/hooks/use-media-query'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const isMobile = useIsMobile()

  return (
    <PageShell className="gap-8 px-4 py-6 md:px-8" style={isMobile ? { paddingBottom: MOBILE_TAB_BAR_HEIGHT } : undefined}>
      {!isMobile && <SiteHeader />}
      <main id="conteudo" tabIndex={-1} className="outline-none">
        <ProfileScreen />
      </main>
      <SiteFooter className="mt-16" />
      {isMobile && <MobileTabBar />}
    </PageShell>
  )
}
