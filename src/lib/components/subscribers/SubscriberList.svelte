	<script lang="ts">
		import { onMount } from 'svelte';
		import type { Subscriber } from '$lib/api/subscribers';
		import { createEventDispatcher } from 'svelte';
		import { goto } from '$app/navigation';
		import { deleteSubscriber, getSubscriberPaymentCycles } from '$lib/api/subscribers';
		import { createPaymentCycle, type PaymentCycle } from '$lib/api/payment_cycles';
		import { canDeleteSubscribers, canEditPayments } from '$lib/auth';
		import { updatePaymentCycle } from '$lib/api/payment_cycles';
		import CycleManagerModal from './CycleManagerModal.svelte';

		export let subscribers: Subscriber[] = [];
		const dispatch = createEventDispatcher();

		let expandedSubscriberId: string | null = null;
		let showCycleModal = false;
		let selectedSubscriberIdForCycle: string | null = null;
		let selectedCycle: PaymentCycle | null = null;
		let canDelete = false;
		let canEditPay = false;
		let sendingLinkForId: string | null = null;

		onMount(() => {
			canDelete = canDeleteSubscribers();
			canEditPay = canEditPayments();
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

		async function handleSendPaymentLink(sub: Subscriber) {
			sendingLinkForId = sub.id;
			try {
				const { savePaymentIntent, buildPaymentPageUrl } = await import('$lib/payu');
				const cycles = await getSubscriberPaymentCycles(sub.id);
				const dueCycles = cycles.filter(c => c.is_due);
				if (dueCycles.length === 0) {
					alert('No due payments found for this reader.');
					return;
				}

				const links: string[] = [];
				let totalAmount = 0;
				for (const cycle of dueCycles) {
					const amount = Number(cycle.amount || 0) - Number(cycle.coupon_amount || 0);
					totalAmount += amount;
					const txnId = `TXN_${sub.id}_${cycle.id}_${Date.now()}`;

					// Save payment intent to PocketBase
					await savePaymentIntent({
						txnId,
						amount: amount.toFixed(2),
						productInfo: `Subscription ${cycle.start_date?.split('T')[0] || ''} to ${cycle.end_date?.split('T')[0] || ''}`,
						firstName: sub.name,
						email: sub.email || 'noemail@example.com',
						phone: sub.phone,
						subscriberId: sub.id,
						cycleId: cycle.id
					});

					// Build payment page URL
					const paymentLink = buildPaymentPageUrl(txnId);
					links.push(paymentLink);

					// Save link to payment cycle
					await updatePaymentCycle(cycle.id, { payment_link: paymentLink });
				}

				// Format phone for SMS
				let phone = sub.phone.replace(/\D/g, '');
				if (phone.length === 10) phone = '91' + phone;

				const dFormat = (iso: string) => {
					if (!iso) return '';
					const d = new Date(iso);
					if (isNaN(d.getTime())) return iso;
					return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
				};

				// Send SMS for each due cycle
				for (const cycle of dueCycles) {
					const cycleAmount = Number(cycle.amount || 0) - Number(cycle.coupon_amount || 0);
					const cycleTxnId = links[dueCycles.indexOf(cycle)].split('/').pop();

					const variables = {
						name: sub.name,
						month: new Date(cycle.start_date).toLocaleString('en-US', { month: 'long' }),
						amount: cycleAmount.toFixed(2),
						total: cycleAmount.toFixed(2),
						dueDate: dFormat(cycle.end_date),
						startDate: dFormat(cycle.start_date),
						endDate: dFormat(cycle.end_date),
						paymentCycleId: cycleTxnId
					};

					import { base } from '$app/paths';
					await fetch(`${base}/api/sms`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							phoneNumber: phone,
							templateType: 'payment_link',
							variables
						})
					});
				}
				
				alert('Payment Link SMS sent successfully!');

				// Also copy to clipboard as backup
				try {
					await navigator.clipboard.writeText(paymentLink);
				} catch {
					// Clipboard copy failed silently — WhatsApp is the primary method
				}
			} catch (e: any) {
				alert(e.message || 'Failed to generate payment link');
			} finally {
				sendingLinkForId = null;
			}
		}
	</script>

	<div class="bg-white rounded-lg shadow-sm overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full min-w-[800px]">
				<thead class="bg-gray-50">
					<tr>
						<th class="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Subscriber</th>
						<th class="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
						<th class="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
						<th class="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Address</th>
						<th class="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Center Details</th>
						<th class="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Joined</th>
						<th class="w-24"></th><!-- Actions -->
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					{#each subscribers as sub (sub.id)}
						<tr
							class="cursor-pointer hover:bg-gray-50"
							on:click={() => toggleExpand(sub.id)}
						>
							<td class="p-4 font-medium text-gray-800 align-top">
								<div class="flex items-center gap-3">
									<div>
										<div class="font-bold text-indigo-700">{sub.name}</div>
										<code class="text-xs text-gray-400 font-mono bg-gray-100 px-1 rounded">{sub.id}</code>
									</div>
								</div>
							</td>

							<td class="p-4 align-top">
								{#if sub.status === 'closed'}
									<span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Closed</span>
								{:else}
									<span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Running</span>
								{/if}
							</td>

							<td class="p-4 text-sm text-gray-600 align-top">
								<div class="font-medium">{sub.phone}</div>
								<div class="text-xs text-gray-500">{sub.email || '-'}</div>
							</td>
							
							<td class="p-4 text-sm text-gray-600 align-top max-w-xs">
								<div class="line-clamp-2" title={sub.address}>{sub.address || 'No Address'}</div>
								{#if sub.landmark}
									<div class="text-xs text-indigo-500 mt-1">Nr. {sub.landmark}</div>
								{/if}
								{#if sub.pincode}
									<div class="text-xs text-gray-400">{sub.pincode}</div>
								{/if}
							</td>

							<td class="p-4 text-sm text-gray-600 align-top">
								{#if sub.center_name}
									<div class="font-semibold text-gray-800">{sub.center_name}</div>
								{:else}
									<div class="text-gray-400 italic">No Center</div>
								{/if}
								<div class="text-xs text-gray-500 mt-1">
									{[sub.city, sub.unit].filter(Boolean).join(' • ')}
								</div>
							</td>

							<td class="p-4 text-sm text-gray-500 align-top">
								{new Date(sub.created).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
							</td>

							<td class="p-4 text-right align-top">
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
								<td colspan="7" class="p-0 bg-gray-50">
									<div class="p-4 border-t border-gray-200">
										<div class="bg-white rounded-lg border border-gray-200 p-4">
											<div class="flex flex-wrap gap-2">
												<button
													on:click|stopPropagation={() => goto(`/dashboard/subscribers/${sub.id}/daily-track`)}
													class="btn-action"
												>
													Daily Track
												</button>
												<button
													on:click|stopPropagation={() => goto(`/dashboard/subscribers/${sub.id}/payment-history`)}
													class="btn-action"
												>
													Payment History
												</button>
												<button
													on:click|stopPropagation={() => goto(`/dashboard/subscribers/${sub.id}/ledger`)}
													class="btn-action"
												>
													Ledger
												</button>
												<button
													on:click|stopPropagation={() => goto(`/dashboard/subscribers/${sub.id}/payment-due`)}
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
													Manage Cycle
												</button>
												<button
													on:click|stopPropagation={() => handleSendPaymentLink(sub)}
													disabled={sendingLinkForId === sub.id}
													class="btn-action bg-purple-50 text-purple-700 ring-purple-200 hover:bg-purple-100"
												>
													{sendingLinkForId === sub.id ? 'Sending...' : 'Send Payment Link'}
												</button>
											</div>
										</div>
									</div>
								</td>
							</tr>
						{/if}
					{:else}
						<tr>
							<td colspan="7" class="p-8 text-center text-gray-500">No subscribers found.</td>
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