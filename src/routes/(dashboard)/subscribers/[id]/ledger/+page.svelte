<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { getSubscriberById, type Subscriber } from "$lib/api/subscribers";
  import { getSubscriberPaymentCycles } from "$lib/api/subscribers";
  import type { PaymentCycle } from "$lib/api/payment_cycles";

  const subscriberId = $page.params.id;

  interface LedgerEntry {
    date: Date;
    displayDate: string;
    description: string;
    debit: number; // amount billed to customer
    credit: number; // amount paid by customer
    balance: number; // running balance
    cycleId?: string;
  }

  let subscriber: Subscriber | null = null;
  let ledgerEntries: LedgerEntry[] = [];
  let isLoading = true;
  let error: string | null = null;
  let totalBalance = 0;

  function parseDate(dateStr: string | null, fallbackDate: Date): Date {
    if (!dateStr) return fallbackDate;
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? fallbackDate : parsed;
  }

  function formatDate(date: Date) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  async function loadLedger() {
    isLoading = true;
    error = null;
    try {
      subscriber = await getSubscriberById(subscriberId);
      const cycles = await getSubscriberPaymentCycles(subscriberId);
      
      const entries: LedgerEntry[] = [];

      for (const cycle of cycles) {
        // 1. Bill Entry (Debit)
        const billDate = parseDate(cycle.start_date, new Date(cycle.created));
        const billAmount = (Number(cycle.amount) || 0) - (Number(cycle.coupon_amount) || 0);
        
        entries.push({
          date: billDate,
          displayDate: formatDate(billDate),
          description: `Bill for ${formatDate(parseDate(cycle.start_date, new Date()))} to ${formatDate(parseDate(cycle.end_date, new Date()))}`,
          debit: billAmount,
          credit: 0,
          balance: 0,
          cycleId: cycle.id
        });

        // 2. Payment Entry (Credit)
        // If it's paid or has an amount_paid recorded
        const paidAmount = Number(cycle.amount_paid) || 0;
        const assumedPaid = !cycle.is_due ? Math.max(paidAmount, billAmount) : paidAmount;

        if (assumedPaid > 0) {
          const defaultPaymentDate = parseDate(cycle.end_date, billDate);
          const paymentDate = parseDate(cycle.last_payment, defaultPaymentDate);
          
          entries.push({
            date: paymentDate,
            displayDate: formatDate(paymentDate),
            description: `Payment Received ${cycle.payment_mode ? `(${cycle.payment_mode})` : ''}`,
            debit: 0,
            credit: assumedPaid,
            balance: 0,
            cycleId: cycle.id
          });
        }
      }

      // Sort entries chronologically (oldest first)
      entries.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Calculate running balance
      let runningBalance = 0;
      for (const entry of entries) {
        runningBalance += entry.debit;
        runningBalance -= entry.credit;
        entry.balance = runningBalance;
      }
      totalBalance = runningBalance;

      // Reverse list to show newest on top
      ledgerEntries = entries.reverse();

    } catch (e: any) {
      error = e.message || "Failed to load ledger";
    } finally {
      isLoading = false;
    }
  }

  onMount(loadLedger);
  
</script>

<div class="space-y-4">
  <div class="flex items-start justify-between gap-4 flex-wrap">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">Customer Ledger</h1>
      {#if subscriber}
        <p class="text-gray-600 mt-1">
          Account: <span class="font-semibold text-gray-900">{subscriber.name}</span>
        </p>
      {/if}
    </div>

    <!-- Balance Summary -->
    <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div class="text-sm text-gray-500 font-medium">Outstanding Balance</div>
      <div class="text-xl font-bold font-mono {totalBalance > 0 ? 'text-red-600' : 'text-green-600'}">
        Rs. {totalBalance > 0 ? totalBalance.toFixed(2) : '0.00'}
      </div>
    </div>
  </div>

  {#if isLoading}
    <div class="p-6 text-sm text-center text-gray-500 bg-white rounded-lg shadow-sm border border-gray-200">
      Loading ledger...
    </div>
  {:else if error}
    <div class="p-6 text-sm text-center text-red-600 bg-red-50 rounded-lg shadow-sm border border-red-200">
      {error}
    </div>
  {:else}
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="p-4 text-left font-semibold text-gray-500 uppercase">Date</th>
              <th class="p-4 text-left font-semibold text-gray-500 uppercase">Description</th>
              <th class="p-4 text-right font-semibold text-gray-500 uppercase">Bill / Debit</th>
              <th class="p-4 text-right font-semibold text-gray-500 uppercase">Payment / Credit</th>
              <th class="p-4 text-right font-semibold text-gray-500 uppercase">Balance</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            {#if ledgerEntries.length === 0}
              <tr>
                <td colspan="5" class="p-8 text-center text-gray-500">No account activity found.</td>
              </tr>
            {/if}
            {#each ledgerEntries as entry}
              <tr class="hover:bg-gray-50">
                <td class="p-4 text-gray-800 font-medium whitespace-nowrap">{entry.displayDate}</td>
                <td class="p-4 text-gray-600">
                  <div class:font-semibold={entry.credit > 0} class:text-green-700={entry.credit > 0}>
                    {entry.description}
                  </div>
                  <div class="text-xs text-gray-400 font-mono mt-0.5">{entry.cycleId}</div>
                </td>
                <td class="p-4 text-right font-mono text-gray-800">{entry.debit > 0 ? `Rs. ${entry.debit.toFixed(2)}` : '—'}</td>
                <td class="p-4 text-right font-mono text-green-700 font-medium">{entry.credit > 0 ? `Rs. ${entry.credit.toFixed(2)}` : '—'}</td>
                <td class="p-4 text-right font-mono font-bold {entry.balance > 0 ? 'text-red-700' : 'text-gray-900'}">
                  Rs. {entry.balance.toFixed(2)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<style>
  @reference '../../../../app.css';
</style>
