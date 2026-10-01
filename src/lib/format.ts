import { normalizeEth, type EthAmount } from './eth'

function formatDecimal(value: EthAmount, decimalSeparator: '.' | ',', minFractionDigits = 2) {
  const [integer, fraction = ''] = normalizeEth(value).split('.')
  const groupSeparator = decimalSeparator === '.' ? ',' : '.'
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator)
  return `${grouped}${decimalSeparator}${fraction.padEnd(minFractionDigits, '0')}`
}

export const formatEth = (value: EthAmount) => `${formatDecimal(value, '.')} ETH`

export const formatEthPtBr = (value: EthAmount) => `${formatDecimal(value, ',')} ETH`

export const formatRating = (rating: number) => rating.toFixed(1)

export const formatReviewCount = (count: number) => `${count} ${count === 1 ? 'avaliação' : 'avaliações'}`

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })

export const formatDate = (iso: string) => dateFormatter.format(new Date(iso))

/** `0x7A42...19E8` style shortening for on-chain addresses. */
export const shortenAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`

export const formatEthRange = (min: EthAmount, max: EthAmount) =>
  `${formatDecimal(min, ',')} - ${formatDecimal(max, ',')} ETH`
