<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import * as XLSX from 'xlsx';
	import { createSubscriber, type Subscriber } from '$lib/api/subscribers';
	
	const dispatch = createEventDispatcher();
	
	let file: File | null = null;
	let isLoading = false;
	let errorMessage = '';
	let successMessage = '';
	let preview: Partial<Subscriber>[] = [];
	let isValidating = false;
	let validationErrors: string[] = [];
	
	// Expected columns in Excel
	const expectedColumns = [
		'name', 'phone', 'email', 'address', 'city', 
		'state', 'pincode', 'unit', 'center_name', 'landmark'
	];
	
	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			file = target.files[0];
			errorMessage = '';
			successMessage = '';
			preview = [];
			validationErrors = [];
			processFile();
		}
	}
	
	async function processFile() {
		if (!file) return;
		
		isValidating = true;
		try {
			const data = await file.arrayBuffer();
			const workbook = XLSX.read(data, { type: 'array' });
			const sheetName = workbook.SheetNames[0];
			const worksheet = workbook.Sheets[sheetName];
			const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
			
			// Skip header row and validate
			const headers = jsonData[0] as string[];
			const rows = jsonData.slice(1) as any[][];
			
			// Check if all required columns are present
			const missingColumns = expectedColumns.filter(col => !headers.includes(col));
			if (missingColumns.length > 0) {
				errorMessage = `Missing columns: ${missingColumns.join(', ')}`;
				return;
			}
			
			// Convert rows to subscriber objects
			preview = rows.map(row => {
				const obj: any = {};
				headers.forEach((header, index) => {
					obj[header] = row[index] || '';
				});
				return obj as Partial<Subscriber>;
			}).filter(sub => sub.name && sub.phone); // Filter out empty rows
			
			// Validate data
			validateData();
			
		} catch (e: any) {
			errorMessage = 'Failed to read Excel file. Please ensure it\'s a valid Excel file.';
		} finally {
			isValidating = false;
		}
	}
	
	function validateData() {
		validationErrors = [];
		const seenPhones = new Set<string>();
		
		preview.forEach((sub, index) => {
			const rowNumber = index + 2; // Excel row number (1-based + header)
			
			// Check required fields
			if (!sub.name) {
				validationErrors.push(`Row ${rowNumber}: Name is required`);
			}
			if (!sub.phone) {
				validationErrors.push(`Row ${rowNumber}: Phone is required`);
			}
			
			// Check phone format
			if (sub.phone && !/^[6-9]\d{9}$/.test(sub.phone.toString())) {
				validationErrors.push(`Row ${rowNumber}: Invalid phone number (must be 10 digits starting with 6-9)`);
			}
			
			// Check duplicate phones
			if (sub.phone) {
				if (seenPhones.has(sub.phone.toString())) {
					validationErrors.push(`Row ${rowNumber}: Duplicate phone number`);
				} else {
					seenPhones.add(sub.phone.toString());
				}
			}
			
			// Check email format
			if (sub.email && sub.email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sub.email.toString())) {
				validationErrors.push(`Row ${rowNumber}: Invalid email format`);
			}
			
			// Check pincode format
			if (sub.pincode && !/^\d{6}$/.test(sub.pincode.toString())) {
				validationErrors.push(`Row ${rowNumber}: Pincode must be 6 digits`);
			}
		});
	}
	
	async function handleImport() {
		if (preview.length === 0) return;
		
		isLoading = true;
		errorMessage = '';
		successMessage = '';
		
		try {
			let successCount = 0;
			let errorCount = 0;
			const errors: string[] = [];
			
			// Import readers one by one
			for (let i = 0; i < preview.length; i++) {
				try {
					await createSubscriber(preview[i]);
					successCount++;
				} catch (e: any) {
					errorCount++;
					errors.push(`Row ${i + 2}: ${e.message || 'Failed to create'}`);
				}
			}
			
			if (errorCount > 0) {
				errorMessage = `Import completed with errors. Success: ${successCount}, Failed: ${errorCount}. Errors: ${errors.slice(0, 5).join('; ')}${errors.length > 5 ? '...' : ''}`;
			} else {
				successMessage = `Successfully imported ${successCount} readers!`;
				preview = [];
				// Reset file input
				const fileInput = document.getElementById('file-input') as HTMLInputElement;
				if (fileInput) fileInput.value = '';
			}
			
			if (successCount > 0) {
				dispatch('success', { count: successCount });
			}
			
		} catch (e: any) {
			errorMessage = 'Import failed: ' + (e.message || 'Unknown error');
		} finally {
			isLoading = false;
		}
	}
	
	function downloadTemplate() {
		// Create a template Excel file
		const template = [
			expectedColumns,
			['John Doe', '9876543210', 'john@example.com', '123 Main St', 'Mumbai', 'Maharashtra', '400001', 'Unit A', 'Center 1', 'Near Park'],
			['Jane Smith', '9876543211', 'jane@example.com', '456 Park Ave', 'Delhi', 'Delhi', '110001', 'Unit B', 'Center 2', 'Near Mall']
		];
		
		const ws = XLSX.utils.aoa_to_sheet(template);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, 'Readers');
		XLSX.writeFile(wb, 'readers_import_template.xlsx');
	}
	
	function closeModal() {
		dispatch('close');
	}
</script>

<div class="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center p-4">
	<div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-full overflow-y-auto p-6">
		<div class="flex justify-between items-center mb-6">
			<h2 class="text-2xl font-bold text-gray-900">Bulk Import Readers</h2>
			<button
				on:click={closeModal}
				class="text-gray-400 hover:text-gray-600 transition-colors"
				aria-label="Close"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
		
		<!-- Instructions -->
		<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
			<h3 class="font-semibold text-blue-900 mb-2">Instructions:</h3>
			<ol class="list-decimal list-inside text-sm text-blue-800 space-y-1">
				<li>Download the Excel template using the button below</li>
				<li>Fill in the reader details in the Excel file</li>
				<li>Upload the completed Excel file</li>
				<li>Review the preview and click "Import Readers"</li>
			</ol>
			<button
				on:click={downloadTemplate}
				class="mt-3 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
			>
				Download Excel Template
			</button>
		</div>
		
		<!-- File Upload -->
		<div class="mb-6">
			<label for="file-input" class="block text-sm font-medium text-gray-700 mb-2">
				Select Excel File
			</label>
			<input
				id="file-input"
				type="file"
				accept=".xlsx,.xls"
				on:change={handleFileSelect}
				class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
			/>
		</div>
		
		{#if errorMessage}
			<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
				<p class="text-sm text-red-800">{errorMessage}</p>
			</div>
		{/if}
		
		{#if successMessage}
			<div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
				<p class="text-sm text-green-800">{successMessage}</p>
			</div>
		{/if}
		
		{#if isValidating}
			<div class="flex items-center justify-center py-8">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
				<span class="ml-2 text-gray-600">Reading Excel file...</span>
			</div>
		{/if}
		
		{#if validationErrors.length > 0}
			<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
				<h4 class="font-semibold text-yellow-800 mb-2">Validation Errors:</h4>
				<ul class="list-disc list-inside text-sm text-yellow-700 space-y-1 max-h-40 overflow-y-auto">
					{#each validationErrors as error}
						<li>{error}</li>
					{/each}
				</ul>
			</div>
		{/if}
		
		<!-- Preview Table -->
		{#if preview.length > 0}
			<div class="mb-6">
				<h3 class="font-semibold text-gray-900 mb-3">Preview ({preview.length} readers)</h3>
				<div class="overflow-x-auto border border-gray-200 rounded-lg">
					<table class="w-full text-sm">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-4 py-2 text-left font-medium text-gray-700">Name</th>
								<th class="px-4 py-2 text-left font-medium text-gray-700">Phone</th>
								<th class="px-4 py-2 text-left font-medium text-gray-700">Email</th>
								<th class="px-4 py-2 text-left font-medium text-gray-700">City</th>
								<th class="px-4 py-2 text-left font-medium text-gray-700">Unit</th>
								<th class="px-4 py-2 text-left font-medium text-gray-700">Center</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each preview.slice(0, 10) as subscriber}
								<tr>
									<td class="px-4 py-2">{subscriber.name}</td>
									<td class="px-4 py-2">{subscriber.phone}</td>
									<td class="px-4 py-2">{subscriber.email}</td>
									<td class="px-4 py-2">{subscriber.city}</td>
									<td class="px-4 py-2">{subscriber.unit}</td>
									<td class="px-4 py-2">{subscriber.center_name}</td>
								</tr>
							{/each}
							{#if preview.length > 10}
								<tr>
									<td colspan="6" class="px-4 py-2 text-center text-gray-500">
										... and {preview.length - 10} more
									</td>
								</tr>
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
		
		<!-- Actions -->
		<div class="flex justify-end gap-3">
			<button
				on:click={closeModal}
				class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors font-medium"
			>
				Cancel
			</button>
			{#if preview.length > 0 && validationErrors.length === 0}
				<button
					on:click={handleImport}
					disabled={isLoading}
					class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
				>
					{#if isLoading}
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
					{/if}
					Import {preview.length} Readers
				</button>
			{/if}
		</div>
	</div>
</div>
