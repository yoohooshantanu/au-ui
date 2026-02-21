<script lang="ts">
  import { onMount } from "svelte";
  import { getSubscriberPaymentCycles } from "$lib/api/subscribers";
  import {
    createPaymentCycle,
    deletePaymentCycle,
    type PaymentCycle,
  } from "$lib/api/payment_cycles";
  import CycleManagerModal from "./CycleManagerModal.svelte";

  export let subscriberId: string;

  let cycles: PaymentCycle[] = [];
  let isLoading = true;
  let error: string | null = null;
  let showCycleModal = false;
  let selectedCycle: PaymentCycle | null = null;
  let copiedId: string | null = null;

  async function loadHistory() {
    isLoading = true;
    try {
      const all = await getSubscriberPaymentCycles(subscriberId);
			cycles = all.filter((c) => !c.is_due);
    } catch (e: any) {
      error = e.message;
    } finally {
      isLoading = false;
    }
  }

  onMount(loadHistory);

  function formatDate(dateString: string | null) {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  async function handleAppendCycle() {
    if (cycles.length === 0) {
      alert("Cannot append cycle. No previous cycles exist.");
      return;
    }
    const latestCycle = cycles[0];
    const lastEndDate = new Date(latestCycle.end_date);
    const newStartDate = new Date(lastEndDate);
    newStartDate.setDate(lastEndDate.getDate() + 1);
    const newEndDate = new Date(
      newStartDate.getFullYear(),
      newStartDate.getMonth() + 1,
      0
    );

    if (
      !confirm(
        `Create new cycle from ${formatDate(
          newStartDate.toISOString()
        )} to ${formatDate(newEndDate.toISOString())}?`
      )
    ) {
      return;
    }
    try {
      // ask for optional coupon amount to apply to the new cycle
      const couponInput = prompt('Enter coupon amount to apply to this new cycle (leave blank for none):');
      const couponAmount = couponInput ? Number(couponInput) : 0;

      await createPaymentCycle({
        subscriber: subscriberId,
        start_date: newStartDate.toISOString(),
        end_date: newEndDate.toISOString(),
        amount: latestCycle.amount,
        coupon_amount: couponAmount,
        product_code: latestCycle.product_code,
        is_due: true,
      });
      await loadHistory();
    } catch (e: any) {
      alert(`Error creating new cycle: ${e.message}`);
    }
  }

  function handleCopyInvoiceLink(cycle: PaymentCycle) {
    navigator.clipboard.writeText(`https://my-isp.com/invoices/${cycle.id}`);
    copiedId = cycle.id;
    setTimeout(() => (copiedId = null), 2000);
  }

  function handleAddCycle() {
    selectedCycle = null;
    showCycleModal = true;
  }
  function handleEditCycle(cycle: PaymentCycle) {
    selectedCycle = cycle;
    showCycleModal = true;
  }
  async function handleDeleteCycle(id: string) {
    if (confirm("Are you sure? This cannot be undone.")) {
      await deletePaymentCycle(id);
      await loadHistory();
    }
  }
</script>

<div>
  <div class="flex flex-wrap gap-2 justify-between items-center mb-4">
    <h4 class="font-semibold text-gray-800 text-base">Payment History</h4>
    <div class="flex items-center gap-2">
      <button
        on:click={handleAppendCycle}
        disabled={cycles.length === 0}
        class="btn-secondary"
      >
        Append Next Cycle
      </button>
      <button on:click={handleAddCycle} class="btn-primary">
        Add Manual Cycle
      </button>
    </div>
  </div>

  {#if isLoading}
    <div class="text-center p-6 text-sm text-gray-500">Loading history...</div>
  {:else if error}
    <div class="text-center p-6 text-sm text-red-600">
      Could not load history.
    </div>
  {:else if cycles.length > 0}
    <div class="border rounded-lg bg-white overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="th">Billing Period</th>
            <th class="th text-center">Amount</th>
            <th class="th text-center">Payment Left</th>
            <th class="th text-center w-1/3">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each cycles as cycle (cycle.id)}
            <tr class="group">
              <td class="td">
                <div class="font-medium text-gray-800">
                  {formatDate(cycle.start_date)}
                </div>
                <div class="text-xs text-gray-500">
                  to {formatDate(cycle.end_date)}
                </div>
              </td>
              <td class="td text-center font-mono text-gray-800"> 
                <div>Rs. {cycle.amount}</div>
                {#if cycle.coupon_amount}
                  <div class="text-xs text-gray-500">Coupon: -Rs. {cycle.coupon_amount}</div>
                {/if}
              </td>
              <td class="td text-center font-mono text-gray-800">
                Rs. {(Number(cycle.amount || 0) - Number(cycle.coupon_amount || 0)).toFixed(2)}
              </td>
              <td class="td text-center">
                <!-- ======== DIRECT ACTION BUTTONS ======== -->
                <div class="flex justify-end items-center gap-2">
                  <button
                    on:click={() => handleCopyInvoiceLink(cycle)}
                    class="btn-action"
                  >
                    Invoice Link
                  </button>
                  <button
                    on:click={() => handleEditCycle(cycle)}
                    class="btn-action"
                  >
                    Edit
                  </button>
                  <button
                    on:click={() => handleDeleteCycle(cycle.id)}
                    class="btn-action-destructive"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div class="text-center p-6 border-2 border-dashed rounded-lg">
      <h3 class="mt-2 text-sm font-semibold text-gray-900">
        No payment history
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        No completed payments found.
      </p>
    </div>
  {/if}
</div>

{#if showCycleModal}
  <CycleManagerModal
    {subscriberId}
    cycle={selectedCycle}
    on:close={() => (showCycleModal = false)}
    on:success={() => {
      showCycleModal = false;
      loadHistory();
    }}
  />
{/if}

<style>
  @reference '../../../app.css';
  .th {
    @apply p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider;
  }
  .td {
    @apply p-3 align-top;
  }
  .badge-due {
    @apply inline-flex items-center rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20;
  }
  .badge-paid {
    @apply inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20;
  }
  .btn-primary {
    @apply rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500;
  }
  .btn-secondary {
    @apply rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50;
  }

  /* Styles for the small, direct action buttons */
  .btn-action {
    @apply rounded bg-white px-2 py-1 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50;
  }
  .btn-action-destructive {
    @apply rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 shadow-sm ring-1 ring-inset ring-red-200 hover:bg-red-100;
  }
</style>
