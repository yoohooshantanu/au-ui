import type { Subscriber } from '$lib/api/subscribers';
import type { PriceRule, PriceScopeType } from '$lib/api/price_rules';

export const DEFAULT_DAILY_PRICE = 8;

export function toYmd(date: Date) {
	const yyyy = date.getFullYear();
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const dd = String(date.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}

export function eachDayYmdInclusive(startYmd: string, endYmd: string): string[] {
	const start = new Date(startYmd);
	const end = new Date(endYmd);
	const out: string[] = [];
	for (let d = new Date(start.getFullYear(), start.getMonth(), start.getDate()); d <= end; d.setDate(d.getDate() + 1)) {
		out.push(toYmd(d));
	}
	return out;
}

function normalize(s?: string | null) {
	return String(s ?? '').trim().toLowerCase();
}

function findRuleFor(scope: PriceScopeType, scopeValue: string, dateYmd: string, rules: PriceRule[]) {
	const target = normalize(scopeValue);
	return rules.find(
		(r) =>
			r.date === dateYmd &&
			r.scope_type === scope &&
			normalize(r.scope_value) === target &&
			r.is_active !== false
	);
}

function findEffectiveDefaultRule(dateYmd: string, rules: PriceRule[]) {
	const candidates = rules
		.filter((r) => r.scope_type === 'default' && r.is_active !== false && String(r.date || '') <= dateYmd)
		.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
	return candidates[0] ?? null;
}

export function resolveDailyPrice(params: {
	subscriber: Subscriber;
	dateYmd: string;
	rules: PriceRule[];
	defaultPrice?: number;
}): number {
	const { subscriber, dateYmd, rules } = params;
	let defaultPrice = params.defaultPrice ?? DEFAULT_DAILY_PRICE;
	const effectiveDefault = findEffectiveDefaultRule(dateYmd, rules);
	if (effectiveDefault) defaultPrice = Number(effectiveDefault.price);

	// Precedence: unit > center > city > default
	const unitRule = findRuleFor('unit', subscriber.unit, dateYmd, rules);
	if (unitRule) return Number(unitRule.price);

	const centerRule = findRuleFor('center', subscriber.center_name, dateYmd, rules);
	if (centerRule) return Number(centerRule.price);

	const cityRule = findRuleFor('city', subscriber.city, dateYmd, rules);
	if (cityRule) return Number(cityRule.price);

	return defaultPrice;
}

export function computeCycleTotal(params: {
	subscriber: Subscriber;
	startYmd: string;
	endYmd: string;
	rules: PriceRule[];
	defaultPrice?: number;
}): number {
	const { subscriber, startYmd, endYmd, rules } = params;
	const defaultPrice = params.defaultPrice ?? DEFAULT_DAILY_PRICE;

	let total = 0;
	for (const day of eachDayYmdInclusive(startYmd, endYmd)) {
		total += resolveDailyPrice({ subscriber, dateYmd: day, rules, defaultPrice });
	}
	return total;
}
