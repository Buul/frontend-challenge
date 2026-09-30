import { normalizeEth, type EthAmount } from './eth'

function formatDecimal(value: EthAmount, decimalSeparator: '.' | ',', minFractionDigits = 2) {
  const [integer, fraction = ''] = normalizeEth(value).split('.')
  const groupSeparator = decimalSeparator === '.' ? ',' : '.'
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator)
  return `${grouped}${decimalSeparator}${fraction.padEnd(minFractionDigits, '0')}`
}

export const formatEth = (value: EthAmount) => `${formatDecimal(value, '.')} ETH`

export const formatEthPtBr = (value: EthAmount) => `${formatDecimal(value, ',')} ETH`

export const formatEthRange = (min: EthAmount, max: EthAmount) =>
  `${formatDecimal(min, ',')} - ${formatDecimal(max, ',')} ETH`
