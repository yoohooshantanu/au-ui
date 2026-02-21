<script lang="ts">
  import { page } from '$app/stores';
  import PaymentHistory from '$lib/components/subscribers/PaymentHistory.svelte';

  const subscriberId = $page.params.id;
</script>

<div class="space-y-4">
  <div>
    <h1 class="text-3xl font-bold text-gray-900">Payment History</h1>
    <p class="text-gray-600 mt-1">Reader: <code class="text-xs text-gray-500">{subscriberId}</code></p>
  </div>

  <div class="bg-white rounded-lg shadow-sm p-4">
    <PaymentHistory subscriberId={subscriberId} />
  </div>
</div>
