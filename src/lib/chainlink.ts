/**
 * Markuce × Chainlink Data Feeds
 * --------------------------------
 * Uses Chainlink's decentralized oracle network for tamper-proof crypto/USD
 * price conversion at checkout. No dependency on CoinGecko or any centralized
 * price API — every quote is backed by on-chain aggregated oracle data.
 *
 * Docs: https://docs.chain.link/data-feeds
 * Explorer: https://data.chain.link/feeds
 */
import { ethers } from 'ethers'

// Minimal AggregatorV3Interface ABI — only what we need
const AGGREGATOR_V3_ABI = [
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() external view returns (uint8)',
  'function description() external view returns (string memory)',
] as const

// ── Chainlink feed addresses ──────────────────────────────────────────────────
// All addresses verified from https://data.chain.link/feeds
export const CHAINLINK_FEEDS = {
  // Ethereum Mainnet
  mainnet: {
    'ETH/USD':  '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    'BTC/USD':  '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
    'LINK/USD': '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c',
  },
  // Polygon Mainnet (cheaper to read; SOL feed lives here)
  polygon: {
    'ETH/USD':  '0xF9680D99D6C9589e2a93a78A04A279e509205945',
    'MATIC/USD':'0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
    'SOL/USD':  '0x4ffC43a60e009B551865A93d232E33Fce9f01507',
    'BTC/USD':  '0xc907E116054Ad103354f2D350FD2514433D57F6f',
    'USDC/USD': '0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7',
    'USDT/USD': '0x0A6513e40db6EB1b165753AD52E80663aeA50545',
  },
} as const

type Network  = keyof typeof CHAINLINK_FEEDS
type FeedPair<N extends Network> = keyof (typeof CHAINLINK_FEEDS)[N]

// Public RPC endpoints — no API key needed for price reads
const RPC: Record<Network, string> = {
  mainnet: import.meta.env.VITE_ETH_RPC_URL     ?? 'https://eth.public-node.com',
  polygon: import.meta.env.VITE_POLYGON_RPC_URL ?? 'https://polygon.llamarpc.com',
}

// Provider cache — one per network
const _providers: Partial<Record<Network, ethers.JsonRpcProvider>> = {}
function getProvider(network: Network): ethers.JsonRpcProvider {
  _providers[network] ??= new ethers.JsonRpcProvider(RPC[network])
  return _providers[network]!
}

// ── Core price read ──────────────────────────────────────────────────────────

export interface ChainlinkPrice {
  /** Decimal price (e.g. 3400.50 for ETH/USD) */
  price: number
  /** Timestamp of the last oracle update */
  updatedAt: Date
  /** Chainlink round ID — useful for on-chain verification */
  roundId: bigint
  /** Feed contract address — show in UI for transparency */
  feedAddress: string
  /** How many seconds ago the feed was updated */
  ageSeconds: number
}

/** Maximum feed age before we consider it stale (1 hour). */
const MAX_STALE_SECONDS = 3600

/**
 * Read a single Chainlink price feed on-chain.
 * Throws if the feed is stale (> 1 hour old).
 */
export async function readFeed<N extends Network>(
  network: N,
  pair: FeedPair<N>
): Promise<ChainlinkPrice> {
  const feedAddress = (CHAINLINK_FEEDS[network] as Record<string, string>)[pair as string]
  const provider    = getProvider(network)
  const feed        = new ethers.Contract(feedAddress, AGGREGATOR_V3_ABI, provider)

  const [decimals, roundData]: [number, [bigint, bigint, bigint, bigint, bigint]] =
    await Promise.all([feed.decimals(), feed.latestRoundData()])

  const [roundId, answer, , updatedAt] = roundData
  const price      = Number(answer) / Math.pow(10, decimals)
  const ageSeconds = Math.floor(Date.now() / 1000) - Number(updatedAt)

  if (ageSeconds > MAX_STALE_SECONDS) {
    throw new Error(
      `Chainlink feed ${String(pair)} on ${network} is stale ` +
      `(last updated ${Math.floor(ageSeconds / 60)} min ago). Refusing to quote.`
    )
  }

  return { price, updatedAt: new Date(Number(updatedAt) * 1000), roundId, feedAddress, ageSeconds }
}

// ── Convenience converters ────────────────────────────────────────────────────

/** $USD → ETH amount (Ethereum mainnet feed) */
export async function usdToEth(usdAmount: number): Promise<{ eth: number; feed: ChainlinkPrice }> {
  const feed = await readFeed('mainnet', 'ETH/USD')
  return { eth: usdAmount / feed.price, feed }
}

/** $USD → SOL amount (Polygon SOL/USD feed) */
export async function usdToSol(usdAmount: number): Promise<{ sol: number; feed: ChainlinkPrice }> {
  const feed = await readFeed('polygon', 'SOL/USD')
  return { sol: usdAmount / feed.price, feed }
}

/** $USD → MATIC amount (Polygon feed) */
export async function usdToMatic(usdAmount: number): Promise<{ matic: number; feed: ChainlinkPrice }> {
  const feed = await readFeed('polygon', 'MATIC/USD')
  return { matic: usdAmount / feed.price, feed }
}

// ── Batch fetch for checkout UI ──────────────────────────────────────────────

export interface AllPrices {
  ethUsd:   ChainlinkPrice | null
  solUsd:   ChainlinkPrice | null
  maticUsd: ChainlinkPrice | null
  fetchedAt: Date
}

/**
 * Fetch all three prices in parallel. Individual failures return null
 * so the checkout can still render with partial data.
 */
export async function getAllPrices(): Promise<AllPrices> {
  const [eth, sol, matic] = await Promise.allSettled([
    readFeed('mainnet', 'ETH/USD'),
    readFeed('polygon', 'SOL/USD'),
    readFeed('polygon', 'MATIC/USD'),
  ])

  return {
    ethUsd:   eth.status   === 'fulfilled' ? eth.value   : null,
    solUsd:   sol.status   === 'fulfilled' ? sol.value   : null,
    maticUsd: matic.status === 'fulfilled' ? matic.value : null,
    fetchedAt: new Date(),
  }
}

/**
 * Given a USD price and AllPrices, compute how much of each crypto the
 * customer needs to send. Safe to call server-side for quote storage.
 */
export function computeCryptoAmounts(usdMinor: number, prices: AllPrices) {
  const usd = usdMinor / 100
  return {
    eth:   prices.ethUsd   ? parseFloat((usd / prices.ethUsd.price).toFixed(8))   : null,
    sol:   prices.solUsd   ? parseFloat((usd / prices.solUsd.price).toFixed(6))   : null,
    matic: prices.maticUsd ? parseFloat((usd / prices.maticUsd.price).toFixed(4)) : null,
  }
}

// ── Price tolerance for on-chain verification ─────────────────────────────────

/**
 * When verifying a crypto payment server-side, we allow a ±2% price
 * slippage window compared to the quoted amount at session creation.
 * This accounts for price movement between quote and payment.
 */
export const PRICE_TOLERANCE_PCT = 2.0

export function isWithinTolerance(
  quotedAmount: number,
  receivedAmount: number,
  tolerancePct = PRICE_TOLERANCE_PCT
): boolean {
  const ratio = receivedAmount / quotedAmount
  const low   = 1 - tolerancePct / 100
  const high  = 1 + tolerancePct / 100
  return ratio >= low && ratio <= high
}
