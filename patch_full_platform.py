import re

with open('code.html', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Replace dash-view-collector
col_start = code.find('<div id="dash-view-collector"')
adm_start = code.find('<div id="dash-view-admin"')
assert col_start != -1 and adm_start != -1

new_collector_html = '''<div id="dash-view-collector" class="space-y-6 hidden">
          <!-- Duty Status Toggle -->
          <div class="p-4 rounded-xl bg-white border border-[#E2EBE4] flex items-center justify-between shadow-sm">
            <div class="flex items-center gap-3">
              <span class="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
              <div>
                <p class="font-bold text-xs text-[#1C2B22]">Active Duty Status: ON ROUTE</p>
                <p class="text-[11px] text-[#4B6354]">Fleet ID: EV-VAN-04 • KA-01-EQ-774 • GPS Telemetry Active</p>
              </div>
            </div>
            <button type="button" onclick="toggleCollectorDuty()" id="btn-collector-duty" class="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs hover:bg-emerald-200 transition-colors">
              Go Off Duty
            </button>
          </div>

          <!-- Verification Alert Banner -->
          <div id="collector-verification-alert" class="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-900 hidden">
          </div>

          <!-- Real Database Derived Collector Statistics -->
          <div class="grid grid-cols-3 gap-3">
            <div class="p-3 rounded-xl bg-white border border-[#E2EBE4]">
              <span class="text-[10px] font-bold text-[#4B6354] uppercase">Assigned Routes</span>
              <p id="collector-stat-assigned" class="text-xl font-extrabold text-[#1C2B22]">--</p>
            </div>
            <div class="p-3 rounded-xl bg-white border border-[#E2EBE4]">
              <span class="text-[10px] font-bold text-[#4B6354] uppercase">Completed Pickups</span>
              <p id="collector-stat-completed" class="text-xl font-extrabold text-emerald-700">--</p>
            </div>
            <div class="p-3 rounded-xl bg-white border border-[#E2EBE4]">
              <span class="text-[10px] font-bold text-[#4B6354] uppercase">Total Weight</span>
              <p id="collector-stat-weight" class="text-xl font-extrabold text-emerald-800">-- kg</p>
            </div>
          </div>

          <!-- Collector Sub-Tabs: Assigned Routes vs Collection History -->
          <div class="flex border-b border-[#E2EBE4] gap-2">
            <button type="button" onclick="switchCollectorSubtab('assigned')" id="col-subtab-btn-assigned" class="px-4 py-2 text-xs font-bold text-emerald-800 border-b-2 border-emerald-600 bg-white">
              Assigned Route Pickups
            </button>
            <button type="button" onclick="switchCollectorSubtab('history')" id="col-subtab-btn-history" class="px-4 py-2 text-xs font-semibold text-[#4B6354] hover:text-[#1C2B22]">
              Completed Collection History
            </button>
          </div>

          <!-- Subview 1: Assigned Routes -->
          <div id="collector-subview-assigned" class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-sm text-[#1C2B22]">Assigned Pickup Routes</h3>
              <span class="text-xs text-[#4B6354]">Authorized collection dispatch</span>
            </div>
            <div id="collector-jobs-container" class="space-y-3"></div>
          </div>

          <!-- Subview 2: Completed Collection History -->
          <div id="collector-subview-history" class="space-y-3 hidden">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-sm text-[#1C2B22]">Collection History &amp; Vault Ledger</h3>
              <span class="text-xs text-[#4B6354]">Statutory recycling chain of custody</span>
            </div>
            <div class="border border-[#E2EBE4] rounded-xl overflow-hidden bg-white shadow-sm">
              <table class="w-full text-left text-xs">
                <thead class="bg-[#F5F7F0] border-b border-[#E2EBE4] text-[#4B6354]">
                  <tr>
                    <th class="p-3">Reference</th>
                    <th class="p-3">Citizen Partner</th>
                    <th class="p-3">Address &amp; Locality</th>
                    <th class="p-3">Items Manifest</th>
                    <th class="p-3">Status</th>
                    <th class="p-3">Action</th>
                  </tr>
                </thead>
                <tbody id="collector-history-table-body" class="divide-y divide-[#E2EBE4]"></tbody>
              </table>
            </div>
          </div>
        </div>

        '''

# 2. Replace dash-view-admin
adm_marker_end = code.find('<!-- =========================================================================\n       5. LIVE TRACKING MODAL')
assert adm_marker_end != -1

new_admin_html = '''<div id="dash-view-admin" class="space-y-6 hidden">
          <!-- Platform KPIs -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="p-3 rounded-xl bg-white border border-[#E2EBE4]">
              <span class="text-[10px] font-bold text-[#4B6354] uppercase">Pending Requests</span>
              <p id="admin-stat-pending" class="text-xl font-extrabold text-amber-600">--</p>
            </div>
            <div class="p-3 rounded-xl bg-white border border-[#E2EBE4]">
              <span class="text-[10px] font-bold text-[#4B6354] uppercase">Active Collectors</span>
              <p id="admin-stat-collectors" class="text-xl font-extrabold text-emerald-700">--</p>
            </div>
            <div class="p-3 rounded-xl bg-white border border-[#E2EBE4]">
              <span class="text-[10px] font-bold text-[#4B6354] uppercase">Total Diverted</span>
              <p id="admin-stat-tonnage" class="text-xl font-extrabold text-[#1C2B22]">-- kg</p>
            </div>
            <div class="p-3 rounded-xl bg-white border border-[#E2EBE4]">
              <span class="text-[10px] font-bold text-[#4B6354] uppercase">Total Pickups</span>
              <p id="admin-stat-total" class="text-xl font-extrabold text-emerald-800">--</p>
            </div>
          </div>

          <!-- Admin Sub-Navigation Tabs -->
          <div class="flex flex-wrap border-b border-[#E2EBE4] gap-1 bg-[#F5F7F0] p-1.5 rounded-xl">
            <button type="button" onclick="switchAdminSubtab('pickups')" id="admin-tab-btn-pickups" class="px-3.5 py-2 rounded-lg text-xs font-bold bg-white text-emerald-800 shadow-sm transition-all">
              Pickup Assignments
            </button>
            <button type="button" onclick="switchAdminSubtab('collectors')" id="admin-tab-btn-collectors" class="px-3.5 py-2 rounded-lg text-xs font-semibold text-[#4B6354] hover:text-[#1C2B22] transition-all">
              Collector Verification
            </button>
            <button type="button" onclick="switchAdminSubtab('users')" id="admin-tab-btn-users" class="px-3.5 py-2 rounded-lg text-xs font-semibold text-[#4B6354] hover:text-[#1C2B22] transition-all">
              User Management
            </button>
            <button type="button" onclick="switchAdminSubtab('centres')" id="admin-tab-btn-centres" class="px-3.5 py-2 rounded-lg text-xs font-semibold text-[#4B6354] hover:text-[#1C2B22] transition-all">
              Collection Centres
            </button>
            <button type="button" onclick="switchAdminSubtab('audit')" id="admin-tab-btn-audit" class="px-3.5 py-2 rounded-lg text-xs font-semibold text-[#4B6354] hover:text-[#1C2B22] transition-all">
              Statutory Audit Trail
            </button>
          </div>

          <!-- SUBVIEW 1: Pickup Assignments & Management -->
          <div id="admin-subview-pickups" class="space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 class="font-bold text-sm text-[#1C2B22]">Pickup Logistics &amp; Dispatch</h3>
                <p class="text-xs text-[#4B6354]">Assign verified collection partners to doorstep requests</p>
              </div>
              <div class="flex items-center gap-2">
                <input type="text" id="admin-pickup-search-input" onkeyup="handleAdminPickupSearch()" placeholder="Search ref, citizen, area..." class="px-3 py-1.5 rounded-xl border border-[#E2EBE4] text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"/>
                <select id="admin-pickup-status-filter" onchange="loadAdminPickups(1)" class="px-3 py-1.5 rounded-xl border border-[#E2EBE4] text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600">
                  <option value="">All Statuses</option>
                  <option value="PENDING" selected>Pending Assignment</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="COLLECTED">Collected</option>
                  <option value="DELIVERED_TO_RECYCLER">Delivered to Recycler</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            <div class="border border-[#E2EBE4] rounded-xl overflow-hidden bg-white shadow-sm overflow-x-auto">
              <table class="w-full text-left text-xs min-w-[700px]">
                <thead class="bg-[#F5F7F0] border-b border-[#E2EBE4] text-[#4B6354]">
                  <tr>
                    <th class="p-3">Ref ID</th>
                    <th class="p-3">Citizen Contact</th>
                    <th class="p-3">Address &amp; Locality</th>
                    <th class="p-3">Items Manifest</th>
                    <th class="p-3">Status</th>
                    <th class="p-3">Collector Assignment</th>
                    <th class="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody id="admin-pending-pickups-body" class="divide-y divide-[#E2EBE4]"></tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div id="admin-pickups-pagination" class="flex items-center justify-between text-xs text-[#4B6354] pt-1"></div>
          </div>

          <!-- SUBVIEW 2: Collector Verification & Fleet Audits -->
          <div id="admin-subview-collectors" class="space-y-3 hidden">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 class="font-bold text-sm text-[#1C2B22]">Collector Partner Verification &amp; Fleet Compliance</h3>
                <p class="text-xs text-[#4B6354]">Audit and authorize e-waste handling licenses</p>
              </div>
              <div class="flex items-center gap-2">
                <input type="text" id="admin-collector-search-input" onkeyup="filterAdminCollectors()" placeholder="Search partner, operator..." class="px-3 py-1.5 rounded-xl border border-[#E2EBE4] text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"/>
                <select id="admin-collector-status-filter" onchange="filterAdminCollectors()" class="px-3 py-1.5 rounded-xl border border-[#E2EBE4] text-xs bg-white focus:outline-none">
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending Review</option>
                  <option value="VERIFIED">Verified Partners</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>
            <div id="admin-collectors-list" class="space-y-2"></div>
          </div>

          <!-- SUBVIEW 3: User Management & Admin Provisioning -->
          <div id="admin-subview-users" class="space-y-3 hidden">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 class="font-bold text-sm text-[#1C2B22]">Platform User Management</h3>
                <p class="text-xs text-[#4B6354]">Registered citizens, collector operators, and administrators</p>
              </div>
              <div class="flex items-center gap-2">
                <input type="text" id="admin-user-search-input" onkeyup="handleAdminUserSearch()" placeholder="Search user by name, email..." class="px-3 py-1.5 rounded-xl border border-[#E2EBE4] text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"/>
                <select id="admin-user-role-filter" onchange="loadAdminUsers(1)" class="px-3 py-1.5 rounded-xl border border-[#E2EBE4] text-xs bg-white focus:outline-none">
                  <option value="">All Roles</option>
                  <option value="CITIZEN">Citizens</option>
                  <option value="COLLECTOR">Collectors</option>
                  <option value="ADMIN">Administrators</option>
                </select>
                <button type="button" onclick="openProvisionAdminModal()" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm whitespace-nowrap">
                  <span class="material-symbols-outlined text-sm">person_add</span>
                  <span>Provision Admin</span>
                </button>
              </div>
            </div>

            <div class="border border-[#E2EBE4] rounded-xl overflow-hidden bg-white shadow-sm overflow-x-auto">
              <table class="w-full text-left text-xs min-w-[650px]">
                <thead class="bg-[#F5F7F0] border-b border-[#E2EBE4] text-[#4B6354]">
                  <tr>
                    <th class="p-3">User ID</th>
                    <th class="p-3">Full Name</th>
                    <th class="p-3">Email Address</th>
                    <th class="p-3">Mobile</th>
                    <th class="p-3">Role</th>
                    <th class="p-3">Registered Date</th>
                  </tr>
                </thead>
                <tbody id="admin-users-table-body" class="divide-y divide-[#E2EBE4]"></tbody>
              </table>
            </div>
            <div id="admin-users-pagination" class="flex items-center justify-between text-xs text-[#4B6354] pt-1"></div>
          </div>

          <!-- SUBVIEW 4: Collection Centres Management -->
          <div id="admin-subview-centres" class="space-y-3 hidden">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 class="font-bold text-sm text-[#1C2B22]">Certified Collection Centres Directory</h3>
                <p class="text-xs text-[#4B6354]">Manage authorized kiosks, drop-off terminals, and smelter vaults</p>
              </div>
              <button type="button" onclick="openAddCentreModal()" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm">
                <span class="material-symbols-outlined text-sm">add_location</span>
                <span>Add New Centre</span>
              </button>
            </div>

            <div class="border border-[#E2EBE4] rounded-xl overflow-hidden bg-white shadow-sm overflow-x-auto">
              <table class="w-full text-left text-xs min-w-[700px]">
                <thead class="bg-[#F5F7F0] border-b border-[#E2EBE4] text-[#4B6354]">
                  <tr>
                    <th class="p-3">Centre Name</th>
                    <th class="p-3">Address</th>
                    <th class="p-3">Coordinates</th>
                    <th class="p-3">Contact</th>
                    <th class="p-3">Accepted Waste Streams</th>
                    <th class="p-3">Status</th>
                  </tr>
                </thead>
                <tbody id="admin-centres-table-body" class="divide-y divide-[#E2EBE4]"></tbody>
              </table>
            </div>
          </div>

          <!-- SUBVIEW 5: Statutory Chain-of-Custody Audit Trail -->
          <div id="admin-subview-audit" class="space-y-3 hidden">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 class="font-bold text-sm text-[#1C2B22]">Statutory Chain-of-Custody Audit Trail</h3>
                <p class="text-xs text-[#4B6354]">Immutable state transition ledger complying with e-waste guidelines</p>
              </div>
              <div class="flex items-center gap-2">
                <input type="text" id="admin-audit-search-input" onkeyup="loadAdminAudit()" placeholder="Filter by Ref ID (e.g. EC-9041)..." class="px-3 py-1.5 rounded-xl border border-[#E2EBE4] text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"/>
                <button type="button" onclick="loadAdminAudit()" class="px-3 py-1.5 rounded-xl bg-white border border-[#E2EBE4] text-xs font-bold text-[#1C2B22] hover:bg-slate-50">
                  Refresh
                </button>
              </div>
            </div>

            <div class="border border-[#E2EBE4] rounded-xl overflow-hidden bg-white shadow-sm overflow-x-auto">
              <table class="w-full text-left text-xs min-w-[750px]">
                <thead class="bg-[#F5F7F0] border-b border-[#E2EBE4] text-[#4B6354]">
                  <tr>
                    <th class="p-3">Timestamp</th>
                    <th class="p-3">Pickup Ref</th>
                    <th class="p-3">Previous State</th>
                    <th class="p-3">New State</th>
                    <th class="p-3">Changed By</th>
                    <th class="p-3">Reason / Audit Note</th>
                  </tr>
                </thead>
                <tbody id="admin-audit-table-body" class="divide-y divide-[#E2EBE4]"></tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>

  '''

# Construct the new dashboard views inside code
code = code[:col_start] + new_collector_html + new_admin_html + code[adm_marker_end:]

# 3. Add new modals: Pickup Details Modal, Provision Admin Modal, Add Centre Modal
new_modals_html = '''
  <!-- =========================================================================
       PICKUP DETAILS REVIEW MODAL (FOR COLLECTOR & ADMIN AUDITS)
       ========================================================================= -->
  <div id="pickup-details-modal" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm hidden flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="details-modal-title">
    <div class="bg-white border border-[#E2EBE4] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
      <div class="p-5 bg-[#FAFAF5] border-b border-[#E2EBE4] flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
            <span class="material-symbols-outlined text-lg">description</span>
          </div>
          <div>
            <h2 id="details-modal-title" class="font-headline-md font-bold text-[#1C2B22]">Pickup Review &amp; Custody Details</h2>
            <p id="details-modal-subtitle" class="text-xs text-[#4B6354]">Official Collection Manifest</p>
          </div>
        </div>
        <button type="button" onclick="closePickupDetailsModal()" class="p-2 text-[#4B6354] hover:text-[#1C2B22] rounded-lg hover:bg-emerald-50">
          <span class="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <div class="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
        <!-- Customer & Location Card -->
        <div class="p-4 rounded-xl bg-[#F5F7F0] border border-[#E2EBE4] space-y-2">
          <div class="flex justify-between items-start">
            <div>
              <span class="text-[10px] font-bold text-[#4B6354] uppercase tracking-wider">Citizen Partner</span>
              <p id="details-citizen-name" class="font-bold text-sm text-[#1C2B22]">--</p>
              <p id="details-citizen-phone" class="text-[#4B6354]">Phone: --</p>
            </div>
            <span id="details-status-badge" class="px-2.5 py-1 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">PENDING</span>
          </div>
          <div class="pt-2 border-t border-[#E2EBE4]">
            <span class="text-[10px] font-bold text-[#4B6354] uppercase tracking-wider">Collection Location</span>
            <p id="details-address" class="text-[#1C2B22] font-medium">--</p>
            <p id="details-locality" class="text-[#4B6354]">--</p>
          </div>
          <div class="pt-2 border-t border-[#E2EBE4] flex justify-between items-center">
            <span>Preferred Window: <strong id="details-timeslot" class="text-[#1C2B22]">--</strong></span>
            <a id="details-map-link" href="#" target="_blank" rel="noopener" class="text-emerald-700 font-bold hover:underline flex items-center gap-1">
              <span>Navigate via Google Maps</span>
              <span class="material-symbols-outlined text-xs">open_in_new</span>
            </a>
          </div>
        </div>

        <!-- Manifest Items Table -->
        <div class="space-y-2">
          <h4 class="font-bold text-xs text-[#1C2B22] uppercase tracking-wider">Scrap Manifest Items</h4>
          <div class="border border-[#E2EBE4] rounded-xl overflow-hidden bg-white">
            <table class="w-full text-left text-xs">
              <thead class="bg-[#F5F7F0] border-b border-[#E2EBE4] text-[#4B6354]">
                <tr>
                  <th class="p-2.5">Category</th>
                  <th class="p-2.5">Quantity</th>
                  <th class="p-2.5">Est. Weight</th>
                  <th class="p-2.5">Notes</th>
                </tr>
              </thead>
              <tbody id="details-items-body" class="divide-y divide-[#E2EBE4]"></tbody>
            </table>
          </div>
        </div>

        <!-- Immutable Audit Trail Timeline -->
        <div class="space-y-2">
          <h4 class="font-bold text-xs text-[#1C2B22] uppercase tracking-wider">Chain-of-Custody Timeline</h4>
          <div id="details-timeline" class="space-y-2 border-l-2 border-emerald-500 pl-3"></div>
        </div>
      </div>

      <div class="p-4 bg-[#FAFAF5] border-t border-[#E2EBE4] flex justify-end">
        <button type="button" onclick="closePickupDetailsModal()" class="px-5 py-2 rounded-xl bg-white border border-[#E2EBE4] text-[#1C2B22] font-bold text-xs hover:bg-slate-50">
          Close Review
        </button>
      </div>
    </div>
  </div>

  <!-- =========================================================================
       ADMIN SECURE PROVISIONING MODAL
       ========================================================================= -->
  <div id="provision-admin-modal" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm hidden flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="provision-modal-title">
    <div class="bg-white border border-[#E2EBE4] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
      <div class="p-5 bg-[#FAFAF5] border-b border-[#E2EBE4] flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
            <span class="material-symbols-outlined text-lg">admin_panel_settings</span>
          </div>
          <div>
            <h2 id="provision-modal-title" class="font-headline-md font-bold text-[#1C2B22]">Provision Administrator</h2>
            <p class="text-xs text-[#4B6354]">Authorizes full platform operator rights</p>
          </div>
        </div>
        <button type="button" onclick="closeProvisionAdminModal()" class="p-2 text-[#4B6354] hover:text-[#1C2B22] rounded-lg hover:bg-emerald-50">
          <span class="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <form onsubmit="handleProvisionAdmin(event)" class="p-6 space-y-3">
        <div>
          <label for="prov-name" class="block text-xs font-bold text-[#1C2B22] mb-1">Full Legal Name *</label>
          <input id="prov-name" type="text" required placeholder="Elena Rostova" class="w-full px-3 py-2 rounded-xl border border-[#E2EBE4] text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"/>
        </div>
        <div>
          <label for="prov-email" class="block text-xs font-bold text-[#1C2B22] mb-1">Official Email Address *</label>
          <input id="prov-email" type="email" required placeholder="elena.admin@ecocircuit.org" class="w-full px-3 py-2 rounded-xl border border-[#E2EBE4] text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"/>
        </div>
        <div>
          <label for="prov-phone" class="block text-xs font-bold text-[#1C2B22] mb-1">Authorized Mobile Number *</label>
          <input id="prov-phone" type="tel" required placeholder="9876500099" class="w-full px-3 py-2 rounded-xl border border-[#E2EBE4] text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"/>
        </div>
        <div>
          <label for="prov-password" class="block text-xs font-bold text-[#1C2B22] mb-1">Temporary Master Password *</label>
          <input id="prov-password" type="password" required minlength="8" placeholder="••••••••••••" class="w-full px-3 py-2 rounded-xl border border-[#E2EBE4] text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"/>
        </div>

        <p id="prov-error" class="text-xs text-rose-600 font-semibold hidden"></p>

        <div class="pt-3 flex gap-2">
          <button type="button" onclick="closeProvisionAdminModal()" class="flex-1 py-2 rounded-xl bg-white border border-[#E2EBE4] text-[#4B6354] font-bold text-xs">
            Cancel
          </button>
          <button id="prov-submit-btn" type="submit" class="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm">
            Authorize Administrator
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- =========================================================================
       ADD COLLECTION CENTRE MODAL
       ========================================================================= -->
  <div id="add-centre-modal" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm hidden flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="centre-modal-title">
    <div class="bg-white border border-[#E2EBE4] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
      <div class="p-5 bg-[#FAFAF5] border-b border-[#E2EBE4] flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
            <span class="material-symbols-outlined text-lg">add_location_alt</span>
          </div>
          <div>
            <h2 id="centre-modal-title" class="font-headline-md font-bold text-[#1C2B22]">Add Collection Centre</h2>
            <p class="text-xs text-[#4B6354]">Register new drop kiosk or certified recycling hub</p>
          </div>
        </div>
        <button type="button" onclick="closeAddCentreModal()" class="p-2 text-[#4B6354] hover:text-[#1C2B22] rounded-lg hover:bg-emerald-50">
          <span class="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <form onsubmit="handleAddCentre(event)" class="p-6 space-y-3">
        <div>
          <label for="centre-name" class="block text-xs font-bold text-[#1C2B22] mb-1">Centre / Kiosk Name *</label>
          <input id="centre-name" type="text" required placeholder="EcoCircuit TechPark Kiosk #05" class="w-full px-3 py-2 rounded-xl border border-[#E2EBE4] text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"/>
        </div>
        <div>
          <label for="centre-address" class="block text-xs font-bold text-[#1C2B22] mb-1">Physical Address *</label>
          <input id="centre-address" type="text" required placeholder="Gate 4, Manyata Embassy Business Park, Nagavara, Bengaluru" class="w-full px-3 py-2 rounded-xl border border-[#E2EBE4] text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"/>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="centre-lat" class="block text-xs font-bold text-[#1C2B22] mb-1">Latitude *</label>
            <input id="centre-lat" type="number" step="any" required placeholder="13.0458" class="w-full px-3 py-2 rounded-xl border border-[#E2EBE4] text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"/>
          </div>
          <div>
            <label for="centre-lng" class="block text-xs font-bold text-[#1C2B22] mb-1">Longitude *</label>
            <input id="centre-lng" type="number" step="any" required placeholder="77.6212" class="w-full px-3 py-2 rounded-xl border border-[#E2EBE4] text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"/>
          </div>
        </div>
        <div>
          <label for="centre-contact" class="block text-xs font-bold text-[#1C2B22] mb-1">Operating Contact / Hotline *</label>
          <input id="centre-contact" type="text" required placeholder="+91 80 4433 2211" class="w-full px-3 py-2 rounded-xl border border-[#E2EBE4] text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"/>
        </div>
        <div>
          <label class="block text-xs font-bold text-[#1C2B22] mb-1">Accepted Waste Categories</label>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <label class="flex items-center gap-1.5"><input type="checkbox" name="acceptedWaste" value="Mobile Phones" checked class="rounded text-emerald-600"/> Mobile Phones</label>
            <label class="flex items-center gap-1.5"><input type="checkbox" name="acceptedWaste" value="Laptops" checked class="rounded text-emerald-600"/> Laptops</label>
            <label class="flex items-center gap-1.5"><input type="checkbox" name="acceptedWaste" value="Batteries" checked class="rounded text-emerald-600"/> Batteries</label>
            <label class="flex items-center gap-1.5"><input type="checkbox" name="acceptedWaste" value="Chargers" checked class="rounded text-emerald-600"/> Chargers &amp; Cables</label>
            <label class="flex items-center gap-1.5"><input type="checkbox" name="acceptedWaste" value="Televisions" class="rounded text-emerald-600"/> Televisions</label>
            <label class="flex items-center gap-1.5"><input type="checkbox" name="acceptedWaste" value="Home Appliances" class="rounded text-emerald-600"/> Appliances</label>
          </div>
        </div>

        <div class="pt-3 flex gap-2">
          <button type="button" onclick="closeAddCentreModal()" class="flex-1 py-2 rounded-xl bg-white border border-[#E2EBE4] text-[#4B6354] font-bold text-xs">
            Cancel
          </button>
          <button id="centre-submit-btn" type="submit" class="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm">
            Save Collection Centre
          </button>
        </div>
      </form>
    </div>
  </div>
'''

# Insert new modals before toast-container or script
insert_idx = code.find('<!-- =========================================================================\n       9. FLOATING TOAST NOTIFICATION CONTAINER')
assert insert_idx != -1

code = code[:insert_idx] + new_modals_html + "\n  " + code[insert_idx:]

print("HTML injection completed. Preparing updated JavaScript script...")

with open('code.html', 'w', encoding='utf-8') as f:
    f.write(code)

