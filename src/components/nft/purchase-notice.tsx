export function PurchaseNotice({ message }: { message?: string }) {
  return (
    <p role="status" className="mt-2 text-xs leading-4 text-tertiary empty:mt-0">
      {message}
    </p>
  )
}
