import { Menu } from '@base-ui/react/menu'
import { Link } from '@tanstack/react-router'
import { useState, type ReactElement } from 'react'
import { useLogout, useSession } from '@/lib/api/auth'
import { useAuthDialog } from '@/lib/auth/auth-dialog'

type AccountMenuProps = {
  /** Rendered for visitors; receives the handler that opens the login dialog. */
  renderLogin: (props: { onClick: () => void }) => ReactElement
  /** Trigger rendered for signed-in users; Base UI wires the menu props into it. */
  trigger: (name: string) => ReactElement
  side?: 'top' | 'bottom'
}

export function AccountMenu({ renderLogin, trigger, side = 'bottom' }: AccountMenuProps) {
  const { user, isPending } = useSession()
  const { open } = useAuthDialog()
  const logout = useLogout()
  const [announcement, setAnnouncement] = useState('')

  return (
    <>
      {/* Stays mounted across login/logout so the change is announced. */}
      <span role="status" className="sr-only">
        {announcement}
      </span>
      {user ? (
        <Menu.Root>
          <Menu.Trigger data-account-trigger="" render={trigger(user.name)} />
          <Menu.Portal>
            <Menu.Positioner side={side} align="end" sideOffset={8} className="z-50">
              <Menu.Popup className="min-w-56 rounded-[10px] border border-border bg-card p-1 text-sm shadow-lg outline-none">
                <Menu.Group>
                  <Menu.GroupLabel className="px-3 pt-2 pb-1 text-[13px] text-muted-foreground">
                    Conectado como
                    <span className="block truncate font-bold text-foreground">{user.name}</span>
                    <span className="block truncate">{user.email}</span>
                  </Menu.GroupLabel>
                </Menu.Group>
                <Menu.Separator className="my-1 h-px bg-border" />
                <Menu.Item
                  render={<Link to="/profile" />}
                  className="cursor-pointer rounded-[6px] px-3 py-2 outline-none data-highlighted:bg-surface-raised data-highlighted:text-brand"
                >
                  Meu perfil
                </Menu.Item>
                <Menu.Item
                  onClick={() =>
                    logout.mutate(undefined, { onSettled: () => setAnnouncement('Você saiu da sua conta.') })
                  }
                  className="cursor-pointer rounded-[6px] px-3 py-2 outline-none data-highlighted:bg-surface-raised data-highlighted:text-brand"
                >
                  Sair
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ) : (
        // While the session check runs the button still renders so the header doesn't shift.
        renderLogin({ onClick: () => !isPending && open() })
      )}
    </>
  )
}