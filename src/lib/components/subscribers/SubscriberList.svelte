<script lang="ts">
	import { onMount } from 'svelte';
	import type { Subscriber } from '$lib/api/subscribers';
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import { deleteSubscriber, getSubscriberPaymentCycles } from '$lib/api/subscribers';
	import { createPaymentCycle, type PaymentCycle } from '$lib/api/payment_cycles';
	import { canDeleteSubscribers } from '$lib/auth';
	import CycleManagerModal from './CycleManagerModal.svelte';

	export let subscribers: Subscriber[] = [];
	const dispatch = createEventDispatcher();

	let expandedSubscriberId: string | null = null;
	let showCycleModal = false;
	let selectedSubscriberIdForCycle: string | null = null;
	let selectedCycle: PaymentCycle | null = null;
	let canDelete = false;

	onMount(() => {
		canDelete = canDeleteSubscribers();
	});

	function toggleExpand(subscriberId: string) {
		expandedSubscriberId = expandedSubscriberId === subscriberId ? null : subscriberId;
	}

	async function handleAppendCycle(subscriberId: string) {
		try {
			const cycles = await getSubscriberPaymentCycles(subscriberId);
			if (cycles.length === 0) {
				alert('Cannot append cycle. No previous cycles exist.');
				return;
			}
			const latestCycle = cycles[0];
			const lastEndDate = new Date(latestCycle.end_date);
			const newStartDate = new Date(lastEndDate);
			newStartDate.setDate(lastEndDate.getDate() + 1);
			const newEndDate = new Date(newStartDate.getFullYear(), newStartDate.getMonth() + 1, 0);

			if (!confirm('Create next cycle?')) return;

			await createPaymentCycle({
				subscriber: subscriberId,
				start_date: newStartDate.toISOString(),
				end_date: newEndDate.toISOString(),
				amount: latestCycle.amount,
				coupon_amount: 0,
				product_code: latestCycle.product_code,
				is_due: true
			});
			alert('Cycle appended.');
		} catch (e: any) {
			alert(e.message || 'Failed to append cycle');
		}
	}

	function handleChangeCycle(subscriberId: string) {
		selectedSubscriberIdForCycle = subscriberId;
		selectedCycle = null;
		showCycleModal = true;
	}

	async function handleDeleteSubscriber(subscriber: Subscriber) {
		if (!confirm(`Delete subscriber ${subscriber.name}? This cannot be undone.`)) return;
		try {
			await deleteSubscriber(subscriber.id);
			dispatch('deleted', subscriber.id);
		} catch (e: any) {
			alert(e.message || 'Failed to delete subscriber');
		}
	}
</script>

<div class="bg-white rounded-lg shadow-sm overflow-hidden">
	<div class="overflow-x-auto">
		<table class="w-full min-w-[800px]">
			<thead class="bg-gray-50">
				<tr>
					<th class="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Subscriber</th>
					<th class="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
					<th class="p-4 text-left text-xs font-semibold text-gray-500 uppercase">
						Center / Location
					</th>
					<th class="w-24"></th><!-- Actions -->
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200">
				{#each subscribers as sub (sub.id)}
					<tr
						class="cursor-pointer hover:bg-gray-50"
						on:click={() => toggleExpand(sub.id)}
					>
						<td class="p-4 font-medium text-gray-800">
							<div class="flex items-center gap-3">
								<div>
									<div>{sub.name}</div>
									<code class="text-xs text-gray-400 font-mono">{sub.id}</code>
								</div>
							</div>
						</td>

						<td class="p-4 text-sm text-gray-600">
							<div>{sub.phone}</div>
							<div class="text-xs text-gray-500">{sub.email || '-'}</div>
						</td>
						<td class="p-4 text-sm text-gray-600">
							{#if sub.center_name}
								<div>{sub.center_name}</div>
							{/if}
							{#if sub.landmark}
								<div class="text-xs text-gray-500">{sub.landmark}</div>
							{/if}
							<div class="text-xs text-gray-500">
								{[sub.city, sub.unit].filter(Boolean).join(' - ')}
							</div>
						</td>
						<td class="p-4 text-right">
							<div class="flex justify-end gap-2" on:click|stopPropagation>
								<button on:click={() => dispatch('edit', sub)} class="btn-action">Edit</button>
								{#if canDelete}
									<button on:click={() => handleDeleteSubscriber(sub)} class="btn-action-destructive">
										Delete
									</button>
								{/if}
							</div>
						</td>
					</tr>

					{#if expandedSubscriberId === sub.id}
						<tr>
							<td colspan="4" class="p-0 bg-gray-50">
								<div class="p-4 border-t border-gray-200">
									<div class="bg-white rounded-lg border border-gray-200 p-4">
										<div class="flex flex-wrap gap-2">
											<button
												on:click|stopPropagation={() => goto(`/subscribers/${sub.id}/daily-track`)}
												class="btn-action"
											>
												Daily Track
											</button>
											<button
												on:click|stopPropagation={() => goto(`/subscribers/${sub.id}/payment-history`)}
												class="btn-action"
											>
												Payment History
											</button>
											<button
												on:click|stopPropagation={() => goto(`/subscribers/${sub.id}/payment-due`)}
												class="btn-action"
											>
												Payment Due
											</button>
											<button
												on:click|stopPropagation={() => handleAppendCycle(sub.id)}
												class="btn-action"
											>
												Append Cycle
											</button>
											<button
												on:click|stopPropagation={() => handleChangeCycle(sub.id)}
												class="btn-action"
											>
												Change Cycle
											</button>
										</div>
									</div>
								</div>
							</td>
						</tr>
					{/if}
				{:else}
					<tr>
						<td colspan="4" class="p-8 text-center text-gray-500">No subscribers found.</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

{#if showCycleModal && selectedSubscriberIdForCycle}
	<CycleManagerModal
		subscriberId={selectedSubscriberIdForCycle}
		cycle={selectedCycle}
		on:close={() => (showCycleModal = false)}
		on:success={() => {
			showCycleModal = false;
		}}
	/>
{/if}

<style>
	@reference '../../../app.css';
	.btn-action {
		@apply rounded bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50;
	}
	.btn-action-destructive {
		@apply rounded bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 shadow-sm ring-1 ring-inset ring-red-200 hover:bg-red-100;
	}
</style>