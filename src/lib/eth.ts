/** Non-negative decimal string with up to 18 fraction digits, e.g. "1.19". Never a float. */
export type EthAmount = string

const DECIMALS = 18
const WEI_PER_ETH = 10n ** BigInt(DECIMALS)
const ETH_PATTERN = /^\d+(\.\d{1,18})?$/

export const isEthAmount = (value: unknown): value is EthAmount => typeof value === 'string' && ETH_PATTERN.test(value)

function toWei(value: EthAmount): bigint {
  if (!isEthAmount(value)) throw new RangeError(`Invalid ETH amount: ${value}`)
  const [integer, fraction = ''] = value.split('.')
  return BigInt(integer) * WEI_PER_ETH + BigInt(fraction.padEnd(DECIMALS, '0'))
}

function fromWei(wei: bigint): EthAmount {
  if (wei < 0n) throw new RangeError('Negative ETH amounts are not supported')
  const fraction = (wei % WEI_PER_ETH).toString().padStart(DECIMALS, '0').replace(/0+$/, '')
  return fraction ? `${wei / WEI_PER_ETH}.${fraction}` : `${wei / WEI_PER_ETH}`
}

export const normalizeEth = (value: EthAmount): EthAmount => fromWei(toWei(value))

export function compareEth(a: EthAmount, b: EthAmount): -1 | 0 | 1 {
  const diff = toWei(a) - toWei(b)
  return diff === 0n ? 0 : diff > 0n ? 1 : -1
}

/** Converts to an integer count of `10^-decimals` ETH units, for UI controls that need numbers (e.g. sliders). */
export function toUnits(value: EthAmount, decimals: number, rounding: 'floor' | 'ceil'): number {
  const unit = 10n ** BigInt(DECIMALS - decimals)
  const wei = toWei(value)
  const units = wei / unit
  return Number(rounding === 'ceil' && wei % unit !== 0n ? units + 1n : units)
}

export const fromUnits = (units: number, decimals: number): EthAmount =>
  fromWei(BigInt(Math.round(units)) * 10n ** BigInt(DECIMALS - decimals))
