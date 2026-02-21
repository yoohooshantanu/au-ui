<script lang="ts">
  const fakeComplaints = [
    {
      id: "CMPT-0815",
      name: "Amit Singh",
      issue: "Repeated Disconnections",
      date: "2025-07-28",
      status: "Open",
      assignedTo: "Tech Team",
    },
    {
      id: "CMPT-0814",
      name: "Ramesh Kumar",
      issue: "Slow Speeds",
      date: "2025-07-27",
      status: "In Progress",
      assignedTo: "Ravi",
    },
    {
      id: "CMPT-0812",
      name: "Priya Sharma",
      issue: "Billing Error",
      date: "2025-07-26",
      status: "Resolved",
      assignedTo: "Finance",
    },
    {
      id: "CMPT-0811",
      name: "Sunita Devi",
      issue: "No Connection",
      date: "2025-07-25",
      status: "Resolved",
      assignedTo: "Tech Team",
    },
    {
      id: "CMPT-0810",
      name: "Vikram Patel",
      issue: "Router Not Working",
      date: "2025-07-24",
      status: "Open",
      assignedTo: "Unassigned",
    },
  ];
</script>

<div class="space-y-8">
  <div>
    <h1 class="text-3xl font-bold text-gray-800">Complaint Management</h1>
    <p class="mt-1 text-gray-500">Track and resolve all customer complaints.</p>
  </div>

  <div class="bg-white p-6 rounded-lg shadow-md">
    <h3 class="text-lg font-semibold text-gray-800 mb-4">Complaint Tickets</h3>
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th class="px-4 py-3">Ticket ID</th>
            <th class="px-4 py-3">Reader</th>
            <th class="px-4 py-3">Issue</th>
            <th class="px-4 py-3">Date Lodged</th>
            <th class="px-4 py-3">Assigned To</th>
            <th class="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {#each fakeComplaints as complaint}
            <tr class="border-b hover:bg-gray-50">
              <td class="px-4 py-3 font-medium">{complaint.id}</td>
              <td class="px-4 py-3">{complaint.name}</td>
              <td class="px-4 py-3">{complaint.issue}</td>
              <td class="px-4 py-3">{complaint.date}</td>
              <td class="px-4 py-3">{complaint.assignedTo}</td>
              <td class="px-4 py-3">
                <span
                  class="px-2 py-1 font-semibold leading-tight rounded-full text-xs
                                   {complaint.status === 'Resolved'
                    ? 'bg-green-100 text-green-700'
                    : ''}
                                   {complaint.status === 'In Progress'
                    ? 'bg-yellow-100 text-yellow-700'
                    : ''}
                                   {complaint.status === 'Open'
                    ? 'bg-red-100 text-red-700'
                    : ''}"
                >
                  {complaint.status}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>
