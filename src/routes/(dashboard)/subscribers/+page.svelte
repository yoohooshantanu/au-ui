<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import type { Subscriber } from '$lib/api/subscribers';
	import type { PageData } from './$types';
	import { getSubscribers } from '$lib/api/subscribers';
	import { onMount } from 'svelte';

	import SubscriberFilter from '$lib/components/subscribers/SubscriberFilter.svelte';
	import SubscriberList from '$lib/components/subscribers/SubscriberList.svelte';
	import SubscriberForm from '$lib/components/subscribers/SubscriberForm.svelte';
	import BulkImportModal from '$lib/components/subscribers/BulkImportModal.svelte';
	import BulkPaymentLinkModal from '$lib/components/subscribers/BulkPaymentLinkModal.svelte';
	import BulkAttendanceModal from '$lib/components/subscribers/BulkAttendanceModal.svelte';
	import BulkDeleteModal from '$lib/components/subscribers/BulkDeleteModal.svelte';

	// The `data` prop is automatically passed from your +page.server.ts load function
	export let data: PageData;

	// UI state
	let showFormModal = false;
	let showBulkImportModal = false;
	let showBulkPaymentLinkModal = false;
	let showBulkAttendanceModal = false;
	let showBulkDeleteModal = false;
	let selectedSubscriber: Subscriber | null = null;

	let totalItems = 0;

	// Infinite Scroll State
	let allSubscribers: Subscriber[] = [];
	let currentPage = 1;
	let hasMore = false;
	let loadingMore = false;
	let loadMoreTrigger: HTMLElement; // Element ref

	// Reactive reset when filter changes (Navigating URL updates data)
	// We track the last loaded query string to distinguish filter changes from spurious reloads
    let lastQueryString: string | null = null;

	$: if (data.subscribersData ) {
        import('$lib/stores/auth').then(store => {
             store.user.subscribe(u => { /* ... */ });
        });

        // Only reset if the URL query string has actually changed (Navigation)
        // or if it's the very first load.
        // We use $page.url.search to track this.
        import('$app/stores').then(({ page }) => {
            page.subscribe(p => {
                const currentQuery = p.url.search;
                
                 // If query changed OR it's a hard reload (page 1 from server match)
                 // Or if lastQueryString is null (initial load)
                if (lastQueryString === null || (currentQuery !== lastQueryString && data.subscribersData?.page === 1)) {
                    console.log('DEBUG: Filter/Nav changed or Initial Load, resetting list.');
                    allSubscribers = data.subscribersData.items;
                    currentPage = data.subscribersData.page;
                    totalItems = data.subscribersData.totalItems;
                    hasMore = currentPage < data.subscribersData.totalPages;
                    lastQueryString = currentQuery;
                }
            })
        });
	}
	onMount(() => {
		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) {
				loadMore();
			}
		}, { 
			rootMargin: '200px', // Pre-fetch before hitting bottom
			threshold: 0 
		});
		
		if (loadMoreTrigger) observer.observe(loadMoreTrigger);
		
		return () => observer.disconnect();
	});

	async function loadMore() {
		if (loadingMore || !hasMore) return;
		loadingMore = true;

		try {
			const query = new URLSearchParams(location.search);
			const nextPage = currentPage + 1;
			
			// Reconstruct params from URL + Data context
			const params = {
				page: nextPage,
				search: query.get('search') ?? undefined,
				city: query.get('city') ?? undefined,
				unit: query.get('unit') ?? undefined,
				pincode: query.get('pincode') ?? undefined,
				center_name: query.get('center_name') ?? undefined,
				landmark: query.get('landmark') ?? undefined,
				// Use the IDs calculated by the loader for "Due Payment" logic
				subscriberIds: data.subscriberIds 
			};

			const res = await getSubscribers(params); // Client-side authenticated fetch
			
			console.log(`DEBUG: API Response - Page ${res.page}/${res.totalPages}, Items returned: ${res.items.length}`);
            console.log(`DEBUG: BEFORE Append - allSubscribers length: ${allSubscribers.length}`);
            
            // Update total items in case it changed
            totalItems = res.totalItems;

			if (res.items.length > 0) {
                // Filter out any duplicates based on ID just in case
                const existingIds = new Set(allSubscribers.map(s => s.id));
                const newItems = res.items.filter(i => !existingIds.has(i.id));
                
                if (newItems.length < res.items.length) {
                    console.warn(`DEBUG: Filtered out ${res.items.length - newItems.length} duplicate items.`);
                }

				allSubscribers = [...allSubscribers, ...newItems];
				currentPage = res.page;
				hasMore = currentPage < res.totalPages;
                
                console.log(`DEBUG: AFTER Append - allSubscribers length: ${allSubscribers.length}`);
			} else {
                console.warn('DEBUG: No items returned for page', nextPage);
				hasMore = false;
			}
		} catch (e) {
			console.error('Failed to load more pages', e);
		} finally {
			loadingMore = false;
		}
	}

	function handleOpenModal(subscriber: Subscriber | null = null) {
		selectedSubscriber = subscriber;
		showFormModal = true;
	}

	function handleFormSuccess() {
		showFormModal = false;
		invalidateAll();
	}

	function handleBulkImportSuccess(event: CustomEvent) {
		showBulkImportModal = false;
		const importedCount = event.detail?.count || 0;
		alert(`Successfully imported ${importedCount} readers!`);
		invalidateAll();
	}

</script>

<div>
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-3xl font-bold text-gray-900">Readers</h1>
		<div class="flex gap-3 flex-wrap">
			<button
				on:click={() => (showBulkImportModal = true)}
				class="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
			>
				Bulk Import
			</button>
			<button
				on:click={() => (showBulkPaymentLinkModal = true)}
				class="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
			>
				Send Payment Links
			</button>
			<button
				on:click={() => (showBulkAttendanceModal = true)}
				class="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
			>
				Mark Attendance
			</button>
			<button
				on:click={() => (showBulkDeleteModal = true)}
				class="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
			>
				Delete Readers
			</button>
			<button
				on:click={() => handleOpenModal()}
				class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
			>
				New Reader
			</button>
		</div>
	</div>

	<!-- Use the lookups data passed from the server -->
	{#if data.lookups}
		<SubscriberFilter lookups={data.lookups} />
	{/if}

	<div class="mt-4">
		<!-- Check for server-side errors -->
		{#if data.error}
			<div class="bg-red-100 text-red-700 p-4 rounded-md">{data.error}</div>
		{:else}
			<SubscriberList
				subscribers={allSubscribers}
				on:edit={(e) => handleOpenModal(e.detail)}
			/>
			
			<!-- Infinite Scroll Trigger / Loader -->
			<div bind:this={loadMoreTrigger} class="py-8 text-center space-y-2">
				<p class="text-xs text-gray-500">
					Showing {allSubscribers.length} of {totalItems} readers
				</p>

				{#if loadingMore}
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
				{:else if hasMore}
                    <!-- Fallback button if Observer fails or user wants manual control -->
                    <button class="text-indigo-600 font-medium hover:underline text-sm" on:click={loadMore}>
                        Load More
                    </button>
				{:else if !hasMore && allSubscribers.length > 0}
					<p class="text-sm text-gray-500">All readers loaded.</p>
				{/if}
			</div>
		{/if}
	</div>
</div>

{#if showFormModal}
	<SubscriberForm
		subscriber={selectedSubscriber}
		on:close={() => (showFormModal = false)}
		on:success={handleFormSuccess}
	/>
{/if}

{#if showBulkImportModal}
	<BulkImportModal
		on:close={() => (showBulkImportModal = false)}
		on:success={handleBulkImportSuccess}
	/>
{/if}

{#if showBulkPaymentLinkModal}
	<BulkPaymentLinkModal
		on:close={() => (showBulkPaymentLinkModal = false)}
		on:success={() => {
			showBulkPaymentLinkModal = false;
			invalidateAll();
		}}
	/>
{/if}

{#if showBulkAttendanceModal}
	<BulkAttendanceModal
		on:close={() => (showBulkAttendanceModal = false)}
		on:success={() => {
			showBulkAttendanceModal = false;
			invalidateAll();
		}}
	/>
{/if}

{#if showBulkDeleteModal}
	<BulkDeleteModal
		on:close={() => (showBulkDeleteModal = false)}
		on:success={() => {
			showBulkDeleteModal = false;
			invalidateAll();
		}}
	/>
{/if}