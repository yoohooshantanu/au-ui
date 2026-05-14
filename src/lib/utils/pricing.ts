import type { Subscriber } from '$lib/api/subscribers';
import type { PriceRule, PriceScopeType } from '$lib/api/price_rules';

export const DEFAULT_DAILY_PRICE = 8;

export function toYmd(date: Date) {
	const yyyy = date.getFullYear();
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const dd = String(date.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}

export function daysBetween(startYmd: string, endYmd: string): number {
	const start = new Date(startYmd);
	const end = new Date(endYmd);
	const diffTime = Math.abs(end.getTime() - start.getTime());
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
	return diffDays + 1; // Inclusive of both start and end days
}

function normalize(s?: string | null) {
	return String(s ?? '').trim().toLowerCase();
}

function findRuleFor(scope: PriceScopeType, scopeValue: string, rules: PriceRule[]) {
	const target = normalize(scopeValue);
	return rules.find(
		(r) =>
			r.scope_type === scope &&
			normalize(r.scope_value) === target &&
			r.is_active !== false
	);
}

function findEffectiveDefaultRule(rules: PriceRule[]) {
	const candidates = rules.filter((r) => r.scope_type === 'default' && r.is_active !== false);
	return candidates[0] ?? null;
}

export function resolveDailyPrice(params: {
	subscriber: Subscriber;
	rules: PriceRule[];
	defaultPrice?: number;
}): number {
	const { subscriber, rules } = params;
	let defaultPrice = params.defaultPrice ?? DEFAULT_DAILY_PRICE;
	const effectiveDefault = findEffectiveDefaultRule(rules);
	if (effectiveDefault) defaultPrice = Number(effectiveDefault.price);

	// Precedence: unit > center > city > default
	const unitRule = findRuleFor('unit', subscriber.unit, rules);
	if (unitRule) return Number(unitRule.price);

	const centerRule = findRuleFor('center', subscriber.center_name, rules);
	if (centerRule) return Number(centerRule.price);

	const cityRule = findRuleFor('city', subscriber.city, rules);
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

	const dailyPrice = resolveDailyPrice({ subscriber, rules, defaultPrice });
	const numDays = daysBetween(startYmd, endYmd);

	return dailyPrice * numDays;
}
