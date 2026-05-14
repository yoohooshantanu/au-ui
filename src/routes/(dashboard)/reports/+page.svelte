<script lang="ts">
	// Reports landing page — links to real report sub-pages
	const reports = [
		{
			title: 'Monthly Billing',
			description: 'View due billing amounts per subscriber for a given month, with reader name, unit, center, coupon, and total cash.',
			href: '/dashboard/reports/monthly-billing',
			color: 'bg-indigo-50 text-indigo-700 ring-indigo-200'
		},
		{
			title: 'Daily Supply Report',
			description: 'View supply data per center for a specific date.',
			href: '/dashboard/reports/supply-report',
			color: 'bg-green-50 text-green-700 ring-green-200'
		},
		{
			title: 'Center-wise Supply',
			description: 'View supply aggregated by center for the month.',
			href: '/dashboard/reports/supply-report?type=center',
			color: 'bg-yellow-50 text-yellow-700 ring-yellow-200'
		},
		{
			title: 'Unit-wise Supply',
			description: 'View supply aggregated by unit for the month.',
			href: '/dashboard/reports/supply-report?type=unit',
			color: 'bg-purple-50 text-purple-700 ring-purple-200'
		},
		{
			title: 'All Units Supply',
			description: 'View combined supply across all units for the month.',
			href: '/dashboard/reports/supply-report?type=all',
			color: 'bg-orange-50 text-orange-700 ring-orange-200'
		},
		{
			title: 'Center-wise Payment/Due',
			description: 'Payment and due amounts aggregated by center for the month.',
			href: '/dashboard/reports/payment-report?type=center',
			color: 'bg-blue-50 text-blue-700 ring-blue-200'
		},
		{
			title: 'Unit-wise Payment/Due',
			description: 'Payment and due amounts aggregated by unit for the month.',
			href: '/dashboard/reports/payment-report?type=unit',
			color: 'bg-teal-50 text-teal-700 ring-teal-200'
		},
		{
			title: 'Daily Payment',
			description: 'Payment summary for a specific date, grouped by center.',
			href: '/dashboard/reports/payment-report?type=daily',
			color: 'bg-cyan-50 text-cyan-700 ring-cyan-200'
		},
		{
			title: 'All Units Payment/Due',
			description: 'Combined payment and due totals across all units.',
			href: '/dashboard/reports/payment-report?type=all',
			color: 'bg-rose-50 text-rose-700 ring-rose-200'
		},
		{
			title: 'Executive-wise Payment/Due',
			description: 'Payment and due amounts grouped by executive (non-admin users).',
			href: '/dashboard/reports/payment-report?type=executive',
			color: 'bg-amber-50 text-amber-700 ring-amber-200'
		},
		{
			title: 'Center-wise Customer List',
			description: 'Complete reader directory grouped by center with contact details.',
			href: '/dashboard/reports/customer-list?type=center',
			color: 'bg-sky-50 text-sky-700 ring-sky-200'
		},
		{
			title: 'Unit-wise Customer List',
			description: 'Reader list grouped by unit.',
			href: '/dashboard/reports/customer-list?type=unit',
			color: 'bg-violet-50 text-violet-700 ring-violet-200'
		},
		{
			title: 'All Units Customer List',
			description: 'Complete list of all readers across all units.',
			href: '/dashboard/reports/customer-list?type=all',
			color: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200'
		},
		{
			title: 'Executive-wise Customer List',
			description: 'Reader list grouped by executive (non-admin users).',
			href: '/dashboard/reports/customer-list?type=executive',
			color: 'bg-lime-50 text-lime-700 ring-lime-200'
		}
	];
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-gray-800">Reports</h1>
		<p class="mt-1 text-gray-500">Select a report to view and download data.</p>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
		{#each reports as report}
			<a
				href={report.href}
				class="block bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
			>
				<div class="flex items-start gap-4">
					<div class="flex-shrink-0 w-10 h-10 rounded-lg {report.color} ring-1 ring-inset flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
						</svg>
					</div>
					<div class="flex-1">
						<h3 class="text-base font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
							{report.title}
						</h3>
						<p class="mt-1 text-sm text-gray-500">{report.description}</p>
					</div>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 group-hover:text-indigo-500 transition-colors flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
					</svg>
				</div>
			</a>
		{/each}
	</div>
</div>
