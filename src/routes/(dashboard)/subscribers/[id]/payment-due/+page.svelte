<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { getSubscriberById, getSubscriberPaymentCycles, type Subscriber } from '$lib/api/subscribers';
  import { updatePaymentCycle, deletePaymentCycle, type PaymentCycle } from '$lib/api/payment_cycles';
  import CycleManagerModal from '$lib/components/subscribers/CycleManagerModal.svelte';
  import SendLinkModal from '$lib/components/subscribers/SendLinkModal.svelte';
  import CouponModal from '$lib/components/subscribers/CouponModal.svelte';
  import { listPriceRules, type PriceRule } from '$lib/api/price_rules';
  import { computeCycleTotal } from '$lib/utils/pricing';

  const subscriberId = $page.params.id;

  let cycles: PaymentCycle[] = [];
  let subscriber: Subscriber | null = null;
  let priceRules: PriceRule[] = [];
  let isLoading = true;
  let error: string | null = null;

  let showCycleModal = false;
  let showLinkModal = false;
  let showCouponModal = false;
  let selectedCycle: PaymentCycle | null = null;

  async function loadDue() {
    isLoading = true;
    error = null;
    try {
      subscriber = await getSubscriberById(subscriberId);
      const all = await getSubscriberPaymentCycles(subscriberId);
      cycles = all.filter((c) => c.is_due);

      // Load pricing rules for the month range covering all due cycles.
      // We keep it simple and safe: min start -> max end across shown cycles.
      if (subscriber && cycles.length > 0) {
        try {
          const starts = cycles.map((c) => new Date(c.start_date)).filter((d) => !Number.isNaN(d.getTime()));
          const ends = cycles.map((c) => new Date(c.end_date)).filter((d) => !Number.isNaN(d.getTime()));
          const minStart = new Date(Math.min(...starts.map((d) => +d)));
          const maxEnd = new Date(Math.max(...ends.map((d) => +d)));
          const startYmd = minStart.toISOString().split('T')[0];
          const endYmd = maxEnd.toISOString().split('T')[0];
          priceRules = await listPriceRules({ start: startYmd, end: endYmd });
        } catch (e) {
          // Pricing is optional; fall back to stored cycle.amount if rules cannot be loaded.
          priceRules = [];
        }
      } else {
        priceRules = [];
      }
    } catch (e: any) {
      error = e.message || 'Failed to load due payments';
    } finally {
      isLoading = false;
    }
  }

  onMount(loadDue);

  function formatDate(dateString: string | null) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function handlePaymentLink(cycle: PaymentCycle) {
    selectedCycle = cycle;
    showLinkModal = true;
  }

  function ymdFromIso(iso: string) {
    return new Date(iso).toISOString().split('T')[0];
  }

  function computedTotal(cycle: PaymentCycle) {
    if (!subscriber) return Number(cycle.amount || 0);
    const startYmd = ymdFromIso(cycle.start_date);
    const endYmd = ymdFromIso(cycle.end_date);
    return computeCycleTotal({ subscriber, startYmd, endYmd, rules: priceRules, defaultPrice: 8 });
  }

  function handleAddCoupon(cycle: PaymentCycle) {
    selectedCycle = cycle;
    showCouponModal = true;
  }

  async function handleCouponSave(event: CustomEvent<number>) {
    if (!selectedCycle) return;
    try {
      await updatePaymentCycle(selectedCycle.id, { coupon_amount: event.detail });
      showCouponModal = false;
      await loadDue();
    } catch (e: any) {
      alert(e.message || 'Failed to update coupon');
    }
  }

  function handleEdit(cycle: PaymentCycle) {
    selectedCycle = cycle;
    showCycleModal = true;
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure? This cannot be undone.')) return;
    try {
      await deletePaymentCycle(id);
      await loadDue();
    } catch (e: any) {
      alert(e.message || 'Failed to delete');
    }
  }
</script>

<div class="space-y-4">
  <div>
    <h1 class="text-3xl font-bold text-gray-900">Payment Due</h1>
    <p class="text-gray-600 mt-1">Subscriber: <code class="text-xs text-gray-500">{subscriberId}</code></p>
  </div>

  <div class="bg-white rounded-lg shadow-sm overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[900px] text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="th">Billing Period</th>
            <th class="th text-right">Total</th>
            <th class="th text-right">Coupon</th>
            <th class="th text-right">Payment Left</th>
            <th class="th text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#if isLoading}
            <tr><td colspan="5" class="p-6 text-center text-gray-500">Loading...</td></tr>
          {:else if error}
            <tr><td colspan="5" class="p-6 text-center text-red-600">{error}</td></tr>
          {:else if cycles.length === 0}
            <tr><td colspan="5" class="p-6 text-center text-gray-500">No due payments found.</td></tr>
          {:else}
            {#each cycles as cycle (cycle.id)}
              <tr>
                <td class="td">
                  <div class="font-medium text-gray-800">{formatDate(cycle.start_date)}</div>
                  <div class="text-xs text-gray-500">to {formatDate(cycle.end_date)}</div>
                </td>
                <td class="td text-right font-mono">₹{computedTotal(cycle).toFixed(2)}</td>
                <td class="td text-right font-mono">₹{Number(cycle.coupon_amount || 0).toFixed(2)}</td>
                <td class="td text-right font-mono">₹{(computedTotal(cycle) - Number(cycle.coupon_amount || 0)).toFixed(2)}</td>
                <td class="td text-right">
                  <div class="flex justify-end gap-2 flex-wrap">
                    <button class="btn-action" on:click={() => handlePaymentLink(cycle)}>Payment Link</button>
                    <button class="btn-action" on:click={() => handleAddCoupon(cycle)}>Add Coupon</button>
                    <button class="btn-action" on:click={() => handleEdit(cycle)}>Edit</button>
                    <button class="btn-action-destructive" on:click={() => handleDelete(cycle.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

{#if showCycleModal && selectedCycle}
  <CycleManagerModal
    subscriberId={subscriberId}
    cycle={selectedCycle}
    on:close={() => (showCycleModal = false)}
    on:success={() => {
      showCycleModal = false;
      loadDue();
    }}
  />
{/if}

{#if showLinkModal && selectedCycle}
  <SendLinkModal cycle={selectedCycle} on:close={() => (showLinkModal = false)} />
{/if}

{#if showCouponModal && selectedCycle}
  <CouponModal
    initialCouponAmount={Number(selectedCycle.coupon_amount ?? 0)}
    on:close={() => (showCouponModal = false)}
    on:save={handleCouponSave}
  />
{/if}

<style>
  @reference '../../../../../app.css';
  .th { @apply p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider; }
  .td { @apply p-4; }
  .btn-action { @apply rounded bg-white px-2 py-1 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50; }
  .btn-action-destructive { @apply rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 shadow-sm ring-1 ring-inset ring-red-200 hover:bg-red-100; }
</style>
