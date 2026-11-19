// Token Radar, model radar-3: one sealed snapshot in, one ranked board out.
//
// The board covers every slug on the snapshot's watchlist (the floor, never the
// ceiling) and every rankable pre-token protocol the snapshot records, below
// the floor or above it. A protocol is pre-token when its record carries no
// token at all: no market cap, no CoinGecko id, no symbol. Protocols whose
// token already trades are kept apart and shown with the market's own value,
// never mixed into the board. Every farm plan is netted: its total cost, the
// share of the launch value a farmer must capture to break even, and a farm /
// thin / skip verdict from the board's own tertiles of that share.
//
// Implied value follows only from the snapshot's own figures. The multiple is
// not a guess and not a hardcoded list of names: it is calibrated from the
// snapshot itself, the median market-cap-to-TVL ratio of the live-token
// protocols in the same category. A category with too few live comparables
// falls back to the global median of the launch-comparable live protocols.
// Then:
//
//   base       = tvl_usd x category_multiple
//   growth     = clamp(change_7d, -60, 120) per cent
//   growthMult = 1 + (growth / 100) x GROWTH_WEIGHT
//   maturity   = 0.6 + min(age_days, 1095) / 1095 x 0.4   (age unknown: 365)
//   chainMult  = 1 + 0.02 x min(chains - 1, 5)
//   implied    = max(1, round(base x growthMult x maturity x chainMult))
//
// No protocol name is ever special-cased: the same function scores every row,
// and the dashboard shows the calibration table and the formula with each
// row's own numbers, so the page recomputes exactly what board.json carries.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  chain_step: number;
  chain_max_steps: number;
  multiple_floor: number;
  multiple_cap: number;
  min_category_comps: number;
}

export const MODEL: ModelConstants = {
  growth_weight: 0.5,
  growth_floor: -60,
  growth_cap: 120,
  maturity_floor: 0.6,
  maturity_range: 0.4,
  maturity_days: 1095,
  unknown_age_days: 365,
  chain_step: 0.02,
  chain_max_steps: 5,
  multiple_floor: 0.05,
  multiple_cap: 1.5,
  min_category_comps: 3,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-3';

/** Out-of-sample validation of the calibration: live-token protocols held out
 * before fitting, scored by the fitted multiples alone. The board is a
 * ranking, so the rank correlation is the headline: a protocol's launch value
 * is ranked, not priced to the dollar, and the level error says so plainly. */
export interface OutOfSample {
  train: number;
  test: number;
  /** Median absolute percentage error of the held-out market caps. */
  mdape_pct: number;
  /** Held-out protocols whose predicted market cap lands within 2x of the real one. */
  within_2x: number;
  /** Rank (Spearman) correlation between predicted and real market cap. */
  spearman: number;
  /** The same two figures for one global multiple, so the category calibration's gain is visible. */
  global_mdape_pct: number;
  global_spearman: number;
}

/** One category's calibrated multiple: the median live mcap/TVL and how many live protocols set it. */
export interface CategoryMultiple {
  category: string;
  multiple: number;
  comps: number;
  fallback: boolean;
}

/** The calibration: the global fallback multiple and one row per category that appears on the board. */
export interface Calibration {
  global_multiple: number;
  global_comps: number;
  by_category: CategoryMultiple[];
}

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** A farm verdict: farm the launch, farm it thin, or skip it. */
export type FarmVerdict = 'farm' | 'thin' | 'skip';

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    category_multiple: number;
    category_comps: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    chain_multiplier: number;
    age_days: number | null;
  };
  /** What the farm plan costs in total: capital plus gas over the plan's transactions. */
  farm_cost_usd: number;
  /** The share of the launch value a farmer must capture to break even, in percent. */
  farm_break_even_pct: number;
  /** Farm, thin or skip: the board's own tertile of the break-even share. */
  farm_verdict: FarmVerdict;
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  category_multiple: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  chain_multiplier: number;
  farm_cost_usd: number;
  farm_break_even_pct: number;
  farm_verdict: FarmVerdict;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard needs: the board, the live set, the calibration and the model. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  calibration: Calibration;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a sorted list of numbers; 0 for an empty list. */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** Categories whose tokens are not launches to compare against: exchanges, bridges and wrapped or staked products. */
const NON_LAUNCH_CATEGORIES = new Set([
  'CEX',
  'Bridge',
  'Canonical Bridge',
  'Cross Chain Bridge',
  'Liquid Staking',
  'Liquid Restaking',
  'Restaked BTC',
]);

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** A whole word, wrapped, staked or staking, in a name: the protocol is a product of a token that trades. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

/** Exchange names a protocol name must not begin with: the protocol is the exchange's own product. */
const EXCHANGE_NAMES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Whether a protocol is one the board may rank: pre-token, and not an exchange,
 * not a versioned pool, not a wrapped, staked or bridged product of a token that
 * already trades. This is the watchlist's own definition, applied to the early
 * radar too, so the board never ranks WBTC or a staked-ETH product as a launch.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category !== null && NON_LAUNCH_CATEGORIES.has(p.category)) return false;
  if (VERSIONED.test(p.name)) return false;
  if (WRAPPED_WORD.test(p.name)) return false;
  const first = p.name.split(' ')[0] ?? '';
  if (EXCHANGE_NAMES.includes(first)) return false;
  return true;
}

/**
 * Calibrate the multiples from the snapshot's own live-token protocols. For
 * each category with at least `min_category_comps` live protocols carrying
 * both a market cap and a TVL, the multiple is their median market-cap-to-TVL
 * ratio; every other category falls back to the global median of the
 * launch-comparable live protocols (exchanges, bridges and wrapped or staked
 * products left out). Every multiple is clamped to the model's floor and cap.
 */
export function calibrate(snapshot: Snapshot, model: ModelConstants = MODEL): Calibration {
  const live = snapshot.protocols.filter(
    (p) => !isPreToken(p) && p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0,
  );
  const comparable = live.filter((p) => p.category === null || !NON_LAUNCH_CATEGORIES.has(p.category));
  const globalMultiple = Math.min(
    model.multiple_cap,
    Math.max(model.multiple_floor, median(comparable.map((p) => p.mcap_usd! / p.tvl_usd))),
  );
  const byCategoryMap = new Map<string, number[]>();
  for (const p of live) {
    const key = p.category ?? 'Other';
    const list = byCategoryMap.get(key) ?? [];
    list.push(p.mcap_usd! / p.tvl_usd);
    byCategoryMap.set(key, list);
  }
  const boardCategories = new Set<string>();
  for (const p of snapshot.protocols) {
    if (isRankable(p)) boardCategories.add(p.category ?? 'Other');
  }
  const byCategory: CategoryMultiple[] = [...boardCategories].sort().map((category) => {
    const comps = byCategoryMap.get(category) ?? [];
    if (comps.length >= model.min_category_comps) {
      return {
        category,
        multiple: Math.min(model.multiple_cap, Math.max(model.multiple_floor, median(comps))),
        comps: comps.length,
        fallback: false,
      };
    }
    return { category, multiple: globalMultiple, comps: comps.length, fallback: true };
  });
  return { global_multiple: globalMultiple, global_comps: comparable.length, by_category: byCategory };
}

/** The multiple one category gets under a calibration, with its fallback. */
export function multipleFor(category: string | null, calibration: Calibration): { multiple: number; comps: number } {
  const key = category ?? 'Other';
  const row = calibration.by_category.find((c) => c.category === key);
  if (row !== undefined) return { multiple: row.multiple, comps: row.comps };
  return { multiple: calibration.global_multiple, comps: 0 };
}

/** Spearman rank correlation between two equal-length lists of numbers. */
function spearman(predicted: number[], actual: number[]): number {
  const n = predicted.length;
  if (n < 3) return 0;
  const rankOf = (values: number[]): Map<number, number> => {
    const order = values.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v || a.i - b.i);
    const ranks = new Map<number, number>();
    order.forEach((o, r) => ranks.set(o.i, r + 1));
    return ranks;
  };
  const rp = rankOf(predicted);
  const ra = rankOf(actual);
  let d2 = 0;
  for (let i = 0; i < n; i++) {
    const d = (rp.get(i) ?? 0) - (ra.get(i) ?? 0);
    d2 += d * d;
  }
  return 1 - (6 * d2) / (n * (n * n - 1));
}

/**
 * Validate the calibration out of sample. The launch-comparable live-token
 * protocols are split deterministically — by category, then by slug, every
 * third one held out — the multiples are fitted on the training two-thirds
 * only, and the held-out market caps are predicted from TVL times the fitted
 * multiple. The same split is scored once more with a single global multiple,
 * so the category calibration's gain is measured, not asserted. The growth,
 * maturity and chain adjustments are launch adjustments, not market-cap
 * predictors, so they stay out of this test: it scores the calibration alone.
 */
export function validateOutOfSample(snapshot: Snapshot, model: ModelConstants = MODEL): OutOfSample {
  const comparable = snapshot.protocols.filter(
    (p) => !isPreToken(p) && p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0 &&
      (p.category === null || !NON_LAUNCH_CATEGORIES.has(p.category)),
  );
  const byCategory = new Map<string, SnapshotProtocol[]>();
  for (const p of comparable) {
    const key = p.category ?? 'Other';
    const list = byCategory.get(key) ?? [];
    list.push(p);
    byCategory.set(key, list);
  }
  const train: SnapshotProtocol[] = [];
  const test: SnapshotProtocol[] = [];
  for (const key of [...byCategory.keys()].sort()) {
    const list = [...(byCategory.get(key) ?? [])].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
    list.forEach((p, i) => (i % 3 === 2 ? test : train).push(p));
  }
  const trainRatios = train.map((p) => p.mcap_usd! / p.tvl_usd);
  const globalMultiple = Math.min(model.multiple_cap, Math.max(model.multiple_floor, median(trainRatios)));
  const trainByCategory = new Map<string, number[]>();
  for (const p of train) {
    const key = p.category ?? 'Other';
    const list = trainByCategory.get(key) ?? [];
    list.push(p.mcap_usd! / p.tvl_usd);
    trainByCategory.set(key, list);
  }
  const fittedMultiple = (category: string | null): number => {
    const ratios = trainByCategory.get(category ?? 'Other') ?? [];
    if (ratios.length >= model.min_category_comps) {
      return Math.min(model.multiple_cap, Math.max(model.multiple_floor, median(ratios)));
    }
    return globalMultiple;
  };
  const predicted: number[] = [];
  const actual: number[] = [];
  const globalPredicted: number[] = [];
  let within2x = 0;
  const errors: number[] = [];
  const errorsGlobal: number[] = [];
  for (const p of test) {
    const pred = Math.max(1, p.tvl_usd * fittedMultiple(p.category));
    const predGlobal = Math.max(1, p.tvl_usd * globalMultiple);
    const act = p.mcap_usd!;
    predicted.push(pred);
    actual.push(act);
    globalPredicted.push(predGlobal);
    const err = Math.abs(pred - act) / act;
    const errGlobal = Math.abs(predGlobal - act) / act;
    errors.push(err);
    errorsGlobal.push(errGlobal);
    if (pred >= act / 2 && pred <= act * 2) within2x++;
  }
  return {
    train: train.length,
    test: test.length,
    mdape_pct: Math.round(median(errors) * 1000) / 10,
    within_2x: within2x,
    spearman: Math.round(spearman(predicted, actual) * 1000) / 1000,
    global_mdape_pct: Math.round(median(errorsGlobal) * 1000) / 10,
    global_spearman: Math.round(spearman(globalPredicted, actual) * 1000) / 1000,
  };
}

/** The multipliers and the implied value one protocol gets under `model` and `calibration`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
  calibration: Calibration,
): {
  implied: number;
  categoryMultiple: number;
  categoryComps: number;
  growthPct: number;
  growthMult: number;
  maturityMult: number;
  chainMult: number;
  age: number | null;
} {
  const age = ageDays(asOf, protocol.listed_at);
  const { multiple: categoryMultiple, comps: categoryComps } = multipleFor(protocol.category, calibration);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult =
    model.maturity_floor +
    (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const extraChains = Math.max(0, protocol.chains.length - 1);
  const chainMult = 1 + model.chain_step * Math.min(extraChains, model.chain_max_steps);
  const base = protocol.tvl_usd * categoryMultiple;
  const implied = Math.max(1, Math.round(base * growthMult * maturityMult * chainMult));
  return { implied, categoryMultiple, categoryComps, growthPct, growthMult, maturityMult, chainMult, age };
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(
  snapshot: Snapshot,
  model: ModelConstants = MODEL,
  calibration: Calibration | null = null,
): BoardRow[] {
  const cal = calibration ?? calibrate(snapshot, model);
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries (it cannot, but the
  // board's coverage is the gate's row and is never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The radar: every rankable pre-token protocol in the snapshot, watchlist or
  // not, below the floor or above it. The floor marks where the watchlist
  // starts, not where the radar stops: a launch the snapshot records is a
  // launch the board ranks, so the biggest non-watchlist protocols — the ones
  // the floor alone would have hidden — are ranked too. Never a replacement
  // for a watchlist row: a chosen protocol stays chosen.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p))
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, model, cal);
    const cost = farmCostUsd(p);
    const breakEven = (cost / Math.max(1, v.implied)) * 100;
    return { p, ...v, cost, breakEven };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  // The verdicts are the board's own tertiles of the break-even share: the
  // third of launches a farmer must capture least of to break even is FARM,
  // the middle third THIN, the most expensive third SKIP. No threshold is
  // guessed; the board grades itself.
  const ordered = [...scored].sort((a, b) => a.breakEven - b.breakEven || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  const verdictOf = new Map<string, FarmVerdict>();
  ordered.forEach((s, i) => {
    const verdict: FarmVerdict = i < Math.ceil(ordered.length / 3) ? 'farm' : i < Math.ceil((ordered.length * 2) / 3) ? 'thin' : 'skip';
    verdictOf.set(s.p.slug, verdict);
  });
  return scored.map((s, i) => {
    const verdict = verdictOf.get(s.p.slug) ?? 'skip';
    const breakEvenRounded = Math.round(s.breakEven * 1e6) / 1e6;
    const steps = farmSteps(s.p, s.age).map(stepText);
    steps.push(
      stepText({
        text: `Total cost of this plan is $${s.cost.toFixed(2)} ($${capitalFor(s.p)} of capital plus about $${(s.cost - capitalFor(s.p)).toFixed(2)} of gas over ${FARM_TX_COUNT} transactions). You break even by capturing just ${fmtBreakEvenPct(breakEvenRounded)}% of the $${s.implied.toLocaleString('en-US')} launch value. Verdict: ${verdict.toUpperCase()}.`,
        cost: `$${s.cost.toFixed(2)} all in`,
        time: `${holdDaysFor(s.age)} days`,
      }),
    );
    return {
      rank: i + 1,
      slug: s.p.slug,
      name: s.p.name,
      category: s.p.category,
      chains: s.p.chains,
      tvl_usd: s.p.tvl_usd,
      change_7d: s.p.change_7d,
      mcap_usd: s.p.mcap_usd,
      listed_at: s.p.listed_at,
      gecko_id: s.p.gecko_id,
      symbol: s.p.symbol,
      token_status: 'pre-token',
      age_days: s.age,
      implied_value_usd: s.implied,
      model: {
        category_multiple: round4(s.categoryMultiple),
        category_comps: s.categoryComps,
        growth_pct: s.growthPct,
        growth_multiplier: round4(s.growthMult),
        maturity_multiplier: round4(s.maturityMult),
        chain_multiplier: round4(s.chainMult),
        age_days: s.age,
      },
      farm_cost_usd: s.cost,
      farm_break_even_pct: breakEvenRounded,
      farm_verdict: verdict,
      farm_steps: steps,
    };
  });
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** What one transaction costs on a chain, in the words a farmer budgets with. */
export function gasFor(chain: string): string {
  const c = chain.toLowerCase();
  if (c === 'ethereum') return 'about $4 to $10 of gas';
  if (c === 'solana') return 'about $0.01 of gas';
  if (c === 'bitcoin') return 'about $1 to $3 of network fees';
  if (['arbitrum', 'optimism', 'base', 'polygon', 'zksync', 'linea', 'blast', 'scroll', 'mantle', 'mode'].includes(c))
    return 'about $0.10 to $1 of gas';
  if (['binance', 'bnb', 'avalanche', 'fantom', 'tron', 'celo', 'gnosis'].includes(c)) return 'about $0.10 to $0.50 of gas';
  return 'about $0.50 to $2 of gas';
}

/** One transaction's gas in dollars, the midpoint of the range gasFor states. */
export function gasUsd(chain: string): number {
  const c = chain.toLowerCase();
  if (c === 'ethereum') return 7;
  if (c === 'solana') return 0.01;
  if (c === 'bitcoin') return 2;
  if (['arbitrum', 'optimism', 'base', 'polygon', 'zksync', 'linea', 'blast', 'scroll', 'mantle', 'mode'].includes(c))
    return 0.55;
  if (['binance', 'bnb', 'avalanche', 'fantom', 'tron', 'celo', 'gnosis'].includes(c)) return 0.3;
  return 1.25;
}

/** How many on-chain transactions the farm plan makes: set-up, second action and four weekly actions. */
export const FARM_TX_COUNT = 6;

/** What the whole farm plan costs: the capital plus gas over its transactions, in dollars. */
export function farmCostUsd(p: SnapshotProtocol): number {
  const chain = chainOf(p);
  return Math.round((capitalFor(p) + gasUsd(chain) * FARM_TX_COUNT) * 100) / 100;
}

/** The share of a launch value, in percent, written so a tiny share still reads: four decimals down to 0.0001%, six below it. */
export function fmtBreakEvenPct(pct: number): string {
  return pct < 0.0001 ? pct.toFixed(6) : pct.toFixed(4);
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's first action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral'))
    return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('leveraged farm'))
    return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('yield') || c.includes('vault'))
    return `Deposit $${capital} of USDC into ${name}'s main vault on ${chain} and keep the shares.`;
  if (c.includes('bridge'))
    return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak'))
    return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt token.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('options'))
    return `Deposit $${capital} of USDC as margin on ${name} and open one small hedged position.`;
  if (c.includes('prediction'))
    return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator'))
    return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable'))
    return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa'))
    return `Mint $${capital} of the protocol's yield-bearing asset on ${chain} and hold it.`;
  if (c.includes('insurance'))
    return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active.`;
  if (c.includes('index'))
    return `Buy $${capital} of ${name}'s index token on ${chain} and hold it.`;
  if (c.includes('payment'))
    return `Top up $${capital} and make one payment through ${name} on ${chain}.`;
  if (c.includes('chain'))
    return `Bridge $${capital} to ${chain} and use one ${name} app with the funds.`;
  if (c.includes('governance'))
    return `Stake $${capital} of the governance asset through ${name} and cast one vote.`;
  if (c.includes('privacy'))
    return `Deposit $${capital} into ${name}'s shielded pool on ${chain} and keep the note.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The category's second action: a different kind of qualifying activity, so the plan is not one click. */
function secondActionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  const small = Math.max(10, Math.round(capital / 5));
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral'))
    return `Borrow $${small} against the deposit on ${name}, then repay it the same week.`;
  if (c.includes('dex') || c.includes('leveraged farm'))
    return `Swap $${small} of USDC for the chain's gas token in ${name}'s main pool.`;
  if (c.includes('yield') || c.includes('vault') || c.includes('curator') || c.includes('allocator'))
    return `Claim or compound the vault's yield once, then leave the position running.`;
  if (c.includes('bridge'))
    return `Bridge $${small} back the other way through ${name} so both directions are used.`;
  if (c.includes('staking') || c.includes('restak'))
    return `Unstake a small test amount once, then restake it, to prove the flow works.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('options'))
    return `Close the hedge and open one fresh position at a smaller size.`;
  if (c.includes('prediction'))
    return `Settle one more market on ${name} with $${small} at a different outcome.`;
  if (c.includes('stable') || c.includes('rwa'))
    return `Redeem $${small} of the position once, then deposit it again.`;
  if (c.includes('insurance'))
    return `File one test claim inquiry on ${name} and read the policy terms.`;
  if (c.includes('index'))
    return `Rebalance $${small} between the index token and USDC on ${chain}.`;
  if (c.includes('payment'))
    return `Send a second payment of $${small} to a different address through ${name}.`;
  if (c.includes('chain'))
    return `Use a second ${name} app on ${chain} with $${small} of the bridged funds.`;
  if (c.includes('governance'))
    return `Vote on a second proposal through ${name} before the voting window closes.`;
  if (c.includes('privacy'))
    return `Withdraw $${small} from the shielded pool to a fresh address.`;
  return `Make a second deposit of $${small} into ${name} on ${chain} a week later.`;
}

/**
 * A protocol's farm plan: eight steps, each an action with a cost and a time.
 * The plan is derived from the protocol's own record (category, chains, TVL,
 * age), never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const gas = gasFor(chain);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: actionFor(p, capital, chain),
      cost: `$${capital} of capital and ${gas}`,
      time: '15 minutes to set up',
    },
    {
      text: secondActionFor(p, capital, chain),
      cost: `about $${Math.max(10, Math.round(capital / 5))} moved and ${gas}`,
      time: '10 minutes',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`,
      cost: `${gas} a week`,
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Never pay a fee to claim an airdrop and never type a seed phrase into a site: a real claim costs only gas.`,
      cost: '$0, and walk away from any site that asks for more',
      time: '2 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  const LIVE_ROWS = 24;
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    category_multiple: row.model.category_multiple,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    chain_multiplier: row.model.chain_multiplier,
    farm_cost_usd: row.farm_cost_usd,
    farm_break_even_pct: row.farm_break_even_pct,
    farm_verdict: row.farm_verdict,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(
  snapshot: Snapshot,
  model: ModelConstants = MODEL,
): { board: BoardRow[]; radar: RadarData } {
  const calibration = calibrate(snapshot, model);
  const board = buildBoard(snapshot, model, calibration);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    calibration,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
