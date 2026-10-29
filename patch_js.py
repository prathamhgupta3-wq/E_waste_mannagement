with open('code.html', 'r', encoding='utf-8') as f:
    code = f.read()

# Let's read the JavaScript functions and insert them right before "function openPickupWizard()"
target_marker = "// --- 4-Step Pickup Request Flow (Wizard) ---"
assert target_marker in code

js_to_insert = '''
    // =========================================================================
    // COLLECTOR & ADMINISTRATOR PORTAL CONTROLLERS
    // =========================================================================

    // --- Collector Sub-Tabs & Modal Review Handlers ---
    function switchCollectorSubtab(tab) {
      const btnAssigned = document.getElementById('col-subtab-btn-assigned');
      const btnHistory = document.getElementById('col-subtab-btn-history');
      const viewAssigned = document.getElementById('collector-subview-assigned');
      const viewHistory = document.getElementById('collector-subview-history');

      if (tab === 'assigned') {
        if (btnAssigned) btnAssigned.className = 'px-4 py-2 text-xs font-bold text-emerald-800 border-b-2 border-emerald-600 bg-white';
        if (btnHistory) btnHistory.className = 'px-4 py-2 text-xs font-semibold text-[#4B6354] hover:text-[#1C2B22]';
        if (viewAssigned) viewAssigned.classList.remove('hidden');
        if (viewHistory) viewHistory.classList.add('hidden');
      } else {
        if (btnAssigned) btnAssigned.className = 'px-4 py-2 text-xs font-semibold text-[#4B6354] hover:text-[#1C2B22]';
        if (btnHistory) btnHistory.className = 'px-4 py-2 text-xs font-bold text-emerald-800 border-b-2 border-emerald-600 bg-white';
        if (viewAssigned) viewAssigned.classList.add('hidden');
        if (viewHistory) viewHistory.classList.remove('hidden');
      }
    }

    async function openPickupDetailsModal(id) {
      const modal = document.getElementById('pickup-details-modal');
      if (!modal) return;
      modal.classList.remove('hidden');

      document.getElementById('details-modal-subtitle').textContent = `Official Collection Manifest #${id}`;
      document.getElementById('details-citizen-name').textContent = 'Loading details...';
      document.getElementById('details-citizen-phone').textContent = 'Phone: ...';
      document.getElementById('details-address').textContent = '...';
      document.getElementById('details-locality').textContent = '...';
      document.getElementById('details-timeslot').textContent = '...';
      document.getElementById('details-status-badge').textContent = '...';
      document.getElementById('details-items-body').innerHTML = `<tr><td colspan="4" class="p-3 text-center text-xs text-[#4B6354]"><span class="inline-block animate-spin mr-1">◌</span> Fetching manifest...</td></tr>`;
      document.getElementById('details-timeline').innerHTML = '';

      try {
        let headers = {};
        if (AppState.token) headers['Authorization'] = `Bearer ${AppState.token}`;
        const res = await fetch(`/api/collector/pickups/${id}`, { headers });
        const data = await res.json();

        if (data.success && data.data) {
          const p = data.data;
          document.getElementById('details-citizen-name').textContent = p.citizenName || 'Registered Citizen Partner';
          document.getElementById('details-citizen-phone').innerHTML = `Phone: <a href="tel:${p.citizenPhone}" class="text-emerald-700 font-bold hover:underline">${p.citizenPhone || 'N/A'}</a>`;
          document.getElementById('details-address').textContent = p.pickupAddress || 'Address on file';
          document.getElementById('details-locality').textContent = `${p.locality} (PIN: ${p.pincode})`;
          document.getElementById('details-timeslot').textContent = `${new Date(p.preferredDate).toLocaleDateString()} • ${p.preferredTimeSlot}`;
          document.getElementById('details-status-badge').textContent = p.currentStatus;
          document.getElementById('details-map-link').href = `https://maps.google.com/?q=${encodeURIComponent(p.pickupAddress + ', ' + p.locality + ', ' + p.pincode)}`;

          // Manifest items
          const itemsBody = document.getElementById('details-items-body');
          if (itemsBody) {
            itemsBody.innerHTML = (p.items || []).map(it => `
              <tr class="hover:bg-slate-50">
                <td class="p-2.5 font-bold text-[#1C2B22]">${it.wasteCategoryId.replace('cat-', '').toUpperCase()}</td>
                <td class="p-2.5 font-medium">${it.quantity} unit(s)</td>
                <td class="p-2.5">${(it.estimatedWeight || 0.5) * (it.quantity || 1)} kg</td>
                <td class="p-2.5 text-[#4B6354]">${it.description || 'Verified scrap item'}</td>
              </tr>
            `).join('');
          }

          // Status history timeline
          const timelineEl = document.getElementById('details-timeline');
          if (timelineEl) {
            timelineEl.innerHTML = (p.statusHistory || []).map(h => `
              <div class="relative pb-2">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-emerald-600"></span>
                  <strong class="text-xs text-[#1C2B22]">${h.newStatus}</strong>
                  <span class="text-[10px] text-[#4B6354]">${new Date(h.timestamp).toLocaleString()}</span>
                </div>
                <p class="text-[11px] text-[#4B6354] mt-0.5 ml-4">${h.reason || 'Status recorded in ledger'}</p>
              </div>
            `).join('');
          }
        } else {
          showToast(data.error || 'Failed to load pickup details.', 'error');
        }
      } catch (err) {
        showToast('Error communicating with backend.', 'error');
      }
    }

    function closePickupDetailsModal() {
      document.getElementById('pickup-details-modal')?.classList.add('hidden');
    }

    // --- Administrator Sub-Tabs & View Controllers ---
    let currentAdminPickupsPage = 1;
    let currentAdminUsersPage = 1;
    let adminPickupsSearchTimer = null;
    let adminUsersSearchTimer = null;

    function switchAdminSubtab(tab) {
      const tabs = ['pickups', 'collectors', 'users', 'centres', 'audit'];
      tabs.forEach(t => {
        const btn = document.getElementById(`admin-tab-btn-${t}`);
        const subview = document.getElementById(`admin-subview-${t}`);
        if (t === tab) {
          if (btn) btn.className = 'px-3.5 py-2 rounded-lg text-xs font-bold bg-white text-emerald-800 shadow-sm transition-all';
          if (subview) subview.classList.remove('hidden');
        } else {
          if (btn) btn.className = 'px-3.5 py-2 rounded-lg text-xs font-semibold text-[#4B6354] hover:text-[#1C2B22] transition-all';
          if (subview) subview.classList.add('hidden');
        }
      });

      if (tab === 'pickups') loadAdminPickups(1);
      if (tab === 'collectors') filterAdminCollectors();
      if (tab === 'users') loadAdminUsers(1);
      if (tab === 'centres') loadAdminCentres();
      if (tab === 'audit') loadAdminAudit();
    }

    async function loadAdminPickups(page = 1) {
      currentAdminPickupsPage = page;
      const tbody = document.getElementById('admin-pending-pickups-body');
      const pagination = document.getElementById('admin-pickups-pagination');
      if (!tbody) return;

      const status = document.getElementById('admin-pickup-status-filter')?.value || '';
      const search = document.getElementById('admin-pickup-search-input')?.value.trim() || '';

      tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-xs text-[#4B6354]"><span class="inline-block animate-spin mr-1">◌</span> Querying database records...</td></tr>`;

      try {
        const params = new URLSearchParams({ page, limit: 10 });
        if (status) params.append('status', status);
        if (search) params.append('search', search);

        const res = await fetch(`/api/admin/pickups?${params.toString()}`, {
          headers: { Authorization: `Bearer ${AppState.token}` }
        });
        const data = await res.json();

        if (data.success && Array.isArray(data.data)) {
          if (data.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-xs text-[#4B6354]">No pickup requests matching the filter criteria.</td></tr>`;
            if (pagination) pagination.innerHTML = `<span>Total matching: 0</span>`;
            return;
          }

          if (!AppState.verifiedCollectorsCache.length) {
            const colRes = await fetch('/api/admin/collectors', { headers: { Authorization: `Bearer ${AppState.token}` } });
            const colData = await colRes.json();
            if (colData.success) {
              AppState.verifiedCollectorsCache = colData.data.filter(c => c.verificationStatus === 'VERIFIED');
            }
          }

          const collectorOptions = AppState.verifiedCollectorsCache.map(c => `
            <option value="${c.id}">${c.businessName} (${c.name})</option>
          `).join('');

          const statusStyles = {
            PENDING: 'bg-amber-100 text-amber-800',
            ASSIGNED: 'bg-blue-100 text-blue-800',
            ACCEPTED: 'bg-indigo-100 text-indigo-800',
            COLLECTED: 'bg-emerald-100 text-emerald-800',
            DELIVERED_TO_RECYCLER: 'bg-purple-100 text-purple-800',
            COMPLETED: 'bg-emerald-800 text-white',
            CANCELLED: 'bg-slate-200 text-slate-700',
            FAILED: 'bg-rose-100 text-rose-800'
          };

          tbody.innerHTML = data.data.map(p => {
            const itemsStr = (p.items || []).map(i => `${i.quantity}x ${i.wasteCategoryId.replace('cat-', '')}`).join(', ');
            const isPending = p.currentStatus === 'PENDING';
            const isCancelable = ['PENDING', 'ASSIGNED', 'ACCEPTED'].includes(p.currentStatus);

            return `
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-3 font-bold text-[#1C2B22]">${p.id}</td>
                <td class="p-3">
                  <span class="font-bold text-[#1C2B22] block">${p.citizenName || 'Citizen'}</span>
                  <span class="text-[11px] text-[#4B6354]">${p.citizenPhone || ''}</span>
                </td>
                <td class="p-3 text-[11px] text-[#4B6354]">
                  <span class="font-medium text-[#1C2B22] block">${p.locality} (${p.pincode})</span>
                  <span class="truncate max-w-[180px] block">${p.pickupAddress}</span>
                </td>
                <td class="p-3 font-medium text-[11px]">${itemsStr || 'Scrap Items'}</td>
                <td class="p-3">
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusStyles[p.currentStatus] || 'bg-slate-100'}">
                    ${p.currentStatus}
                  </span>
                </td>
                <td class="p-3">
                  ${isPending ? `
                    <div class="flex items-center gap-1.5">
                      <select id="collector-sel-${p.id}" class="text-xs bg-white border border-[#E2EBE4] rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 max-w-[140px]">
                        <option value="">Assign...</option>
                        ${collectorOptions}
                      </select>
                      <button type="button" onclick="assignPickupToCollector('${p.id}')" class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm whitespace-nowrap">
                        Assign
                      </button>
                    </div>
                  ` : `
                    <span class="text-xs text-[#1C2B22] font-semibold">${p.collectorName || 'Assigned'}</span>
                  `}
                </td>
                <td class="p-3">
                  <div class="flex items-center gap-2">
                    <button type="button" onclick="openPickupDetailsModal('${p.id}')" class="text-xs font-bold text-emerald-700 hover:underline">Review</button>
                    ${isCancelable ? `<button type="button" onclick="confirmCancelPickupByAdmin('${p.id}')" class="text-xs font-bold text-rose-600 hover:underline">Cancel</button>` : ''}
                  </div>
                </td>
              </tr>
            `;
          }).join('');

          if (pagination) {
            pagination.innerHTML = `
              <span>Showing page ${data.page} of ${data.totalPages} (${data.total} total records)</span>
              <div class="flex gap-1">
                <button type="button" ${data.page <= 1 ? 'disabled class="opacity-40 cursor-not-allowed px-2.5 py-1 bg-white border border-[#E2EBE4] rounded-lg"' : `onclick="loadAdminPickups(${data.page - 1})" class="px-2.5 py-1 bg-white border border-[#E2EBE4] hover:bg-emerald-50 rounded-lg font-bold"`}>Prev</button>
                <button type="button" ${data.page >= data.totalPages ? 'disabled class="opacity-40 cursor-not-allowed px-2.5 py-1 bg-white border border-[#E2EBE4] rounded-lg"' : `onclick="loadAdminPickups(${data.page + 1})" class="px-2.5 py-1 bg-white border border-[#E2EBE4] hover:bg-emerald-50 rounded-lg font-bold"`}>Next</button>
              </div>
            `;
          }
        }
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-xs text-rose-600">Failed to load pickup requests from backend database.</td></tr>`;
      }
    }

    function handleAdminPickupSearch() {
      clearTimeout(adminPickupsSearchTimer);
      adminPickupsSearchTimer = setTimeout(() => {
        loadAdminPickups(1);
      }, 300);
    }

    function confirmCancelPickupByAdmin(id) {
      openConfirmDialog({
        title: `Cancel Pickup Request #${id}`,
        desc: `Are you sure you want to cancel pickup #${id} as Platform Administrator? This state change will be immutably recorded in the statutory audit log.`,
        onConfirm: async () => {
          try {
            const res = await fetch(`/api/pickups/${id}/cancel`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${AppState.token}`
              },
              body: JSON.stringify({ reason: 'Administrative cancellation by Platform Operator' })
            });
            const data = await res.json();
            if (data.success) {
              showToast(`Pickup #${id} cancelled by Administrator.`, 'info');
              loadAdminPickups(currentAdminPickupsPage);
            } else {
              showToast(data.error || 'Failed to cancel pickup.', 'error');
            }
          } catch (e) {
            showToast('Error communicating with backend.', 'error');
          }
        }
      });
    }

    async function filterAdminCollectors() {
      const listEl = document.getElementById('admin-collectors-list');
      if (!listEl) return;

      const status = document.getElementById('admin-collector-status-filter')?.value || '';
      const search = document.getElementById('admin-collector-search-input')?.value.trim().toLowerCase() || '';

      listEl.innerHTML = `<div class="p-4 text-center text-xs text-[#4B6354]"><span class="inline-block animate-spin mr-1">◌</span> Querying collector partner registry...</div>`;

      try {
        const res = await fetch('/api/admin/collectors', {
          headers: { Authorization: `Bearer ${AppState.token}` }
        });
        const data = await res.json();

        if (data.success && Array.isArray(data.data)) {
          let filtered = data.data;
          if (status) filtered = filtered.filter(c => c.verificationStatus === status);
          if (search) {
            filtered = filtered.filter(c =>
              c.businessName.toLowerCase().includes(search) ||
              c.name.toLowerCase().includes(search) ||
              c.email.toLowerCase().includes(search)
            );
          }

          if (filtered.length === 0) {
            listEl.innerHTML = `<div class="p-6 bg-white border border-[#E2EBE4] rounded-xl text-center text-xs text-[#4B6354]">No collector accounts found matching criteria.</div>`;
            return;
          }

          listEl.innerHTML = filtered.map(c => {
            const isPending = c.verificationStatus === 'PENDING';
            const isVerified = c.verificationStatus === 'VERIFIED';
            return `
              <div class="p-4 rounded-xl border border-[#E2EBE4] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-sm text-[#1C2B22]">${c.businessName}</span>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isVerified ? 'bg-emerald-100 text-emerald-800' : (isPending ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')}">
                      ${c.verificationStatus}
                    </span>
                  </div>
                  <p class="text-xs text-[#4B6354] mt-1">Operator: <strong>${c.name}</strong> • Email: ${c.email} • Phone: ${c.phone}</p>
                  <p class="text-[11px] text-emerald-800 mt-0.5">Authorized Fleet Areas: ${(c.serviceAreas || []).join(', ') || 'All Sectors'}</p>
                </div>
                <div class="flex items-center gap-2">
                  ${isPending ? `
                    <button type="button" onclick="verifyCollectorWithConfirm('${c.id}', 'VERIFIED')" class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm">
                      Verify &amp; Authorize
                    </button>
                    <button type="button" onclick="verifyCollectorWithConfirm('${c.id}', 'REJECTED')" class="px-3.5 py-1.5 rounded-xl bg-white border border-[#E2EBE4] text-rose-600 hover:bg-rose-50 font-bold text-xs">
                      Reject
                    </button>
                  ` : (isVerified ? `
                    <span class="text-xs text-emerald-700 font-bold flex items-center gap-1">
                      <span class="material-symbols-outlined text-sm">verified</span>
                      <span>Certified Fleet Active</span>
                    </span>
                  ` : `
                    <span class="text-xs text-rose-600 font-bold">Audit Rejected</span>
                  `)}
                </div>
              </div>
            `;
          }).join('');
        }
      } catch (err) {
        listEl.innerHTML = `<div class="p-4 text-center text-xs text-rose-600">Failed to load collectors.</div>`;
      }
    }

    function verifyCollectorWithConfirm(collectorId, status) {
      openConfirmDialog({
        title: status === 'VERIFIED' ? 'Verify Collector Partner' : 'Reject Collector Application',
        desc: `Are you sure you want to mark this collector partner as ${status}? Verified collectors are authorized to accept and process live e-waste route dispatches.`,
        onConfirm: async () => {
          try {
            const res = await fetch(`/api/admin/collectors/${collectorId}/verify`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${AppState.token}`
              },
              body: JSON.stringify({ verificationStatus: status })
            });
            const data = await res.json();
            if (data.success) {
              showToast(`Collector account marked as ${status}!`, 'success');
              filterAdminCollectors();
            } else {
              showToast(data.error || 'Failed to update collector status.', 'error');
            }
          } catch (e) {
            showToast('Error communicating with backend.', 'error');
          }
        }
      });
    }

    async function loadAdminUsers(page = 1) {
      currentAdminUsersPage = page;
      const tbody = document.getElementById('admin-users-table-body');
      const pagination = document.getElementById('admin-users-pagination');
      if (!tbody) return;

      const role = document.getElementById('admin-user-role-filter')?.value || '';
      const search = document.getElementById('admin-user-search-input')?.value.trim() || '';

      tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-xs text-[#4B6354]"><span class="inline-block animate-spin mr-1">◌</span> Querying user registry...</td></tr>`;

      try {
        const params = new URLSearchParams({ page, limit: 10 });
        if (role) params.append('role', role);
        if (search) params.append('search', search);

        const res = await fetch(`/api/admin/users?${params.toString()}`, {
          headers: { Authorization: `Bearer ${AppState.token}` }
        });
        const data = await res.json();

        if (data.success && Array.isArray(data.data)) {
          if (data.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-xs text-[#4B6354]">No user records found.</td></tr>`;
            if (pagination) pagination.innerHTML = `<span>Total matching: 0</span>`;
            return;
          }

          const roleBadges = {
            CITIZEN: 'bg-emerald-100 text-emerald-800',
            COLLECTOR: 'bg-blue-100 text-blue-800',
            ADMIN: 'bg-purple-100 text-purple-800'
          };

          tbody.innerHTML = data.data.map(u => `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="p-3 font-mono text-[11px] text-[#4B6354]">${u.id}</td>
              <td class="p-3 font-bold text-[#1C2B22]">${u.name}</td>
              <td class="p-3 text-[#4B6354]">${u.email}</td>
              <td class="p-3 text-[#4B6354]">${u.phone || 'N/A'}</td>
              <td class="p-3">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${roleBadges[u.role] || 'bg-slate-100'}">
                  ${u.role}
                </span>
              </td>
              <td class="p-3 text-[11px] text-[#4B6354]">${new Date(u.createdAt).toLocaleDateString()}</td>
            </tr>
          `).join('');

          if (pagination) {
            pagination.innerHTML = `
              <span>Showing page ${data.page} of ${data.totalPages} (${data.total} total accounts)</span>
              <div class="flex gap-1">
                <button type="button" ${data.page <= 1 ? 'disabled class="opacity-40 cursor-not-allowed px-2.5 py-1 bg-white border border-[#E2EBE4] rounded-lg"' : `onclick="loadAdminUsers(${data.page - 1})" class="px-2.5 py-1 bg-white border border-[#E2EBE4] hover:bg-emerald-50 rounded-lg font-bold"`}>Prev</button>
                <button type="button" ${data.page >= data.totalPages ? 'disabled class="opacity-40 cursor-not-allowed px-2.5 py-1 bg-white border border-[#E2EBE4] rounded-lg"' : `onclick="loadAdminUsers(${data.page + 1})" class="px-2.5 py-1 bg-white border border-[#E2EBE4] hover:bg-emerald-50 rounded-lg font-bold"`}>Next</button>
              </div>
            `;
          }
        }
      } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-xs text-rose-600">Failed to query users from backend.</td></tr>`;
      }
    }

    function handleAdminUserSearch() {
      clearTimeout(adminUsersSearchTimer);
      adminUsersSearchTimer = setTimeout(() => {
        loadAdminUsers(1);
      }, 300);
    }

    function openProvisionAdminModal() {
      document.getElementById('provision-admin-modal')?.classList.remove('hidden');
    }

    function closeProvisionAdminModal() {
      document.getElementById('provision-admin-modal')?.classList.add('hidden');
    }

    async function handleProvisionAdmin(e) {
      e.preventDefault();
      const name = document.getElementById('prov-name').value.trim();
      const email = document.getElementById('prov-email').value.trim();
      const phone = document.getElementById('prov-phone').value.trim();
      const password = document.getElementById('prov-password').value;

      const btn = document.getElementById('prov-submit-btn');
      const errBox = document.getElementById('prov-error');

      btn.disabled = true;
      btn.textContent = 'Authorizing...';
      errBox.classList.add('hidden');

      try {
        const res = await fetch('/api/admin/provision-admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AppState.token}`
          },
          body: JSON.stringify({ name, email, phone, password })
        });
        const data = await res.json();

        if (data.success) {
          showToast(`Administrator account provisioned for ${name}!`, 'success');
          closeProvisionAdminModal();
          loadAdminUsers(1);
        } else {
          errBox.textContent = data.error || (data.details ? data.details[0].message : 'Provisioning failed.');
          errBox.classList.remove('hidden');
        }
      } catch (err) {
        errBox.textContent = 'Network or server error during administrator provisioning.';
        errBox.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Authorize Administrator';
      }
    }

    async function loadAdminCentres() {
      const tbody = document.getElementById('admin-centres-table-body');
      if (!tbody) return;

      tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-xs text-[#4B6354]"><span class="inline-block animate-spin mr-1">◌</span> Querying collection hubs...</td></tr>`;

      try {
        const res = await fetch('/api/admin/collection-centres', {
          headers: { Authorization: `Bearer ${AppState.token}` }
        });
        const data = await res.json();

        if (data.success && Array.isArray(data.data)) {
          tbody.innerHTML = data.data.map(c => `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="p-3 font-bold text-[#1C2B22]">${c.name}</td>
              <td class="p-3 text-[#4B6354]">${c.address}</td>
              <td class="p-3 font-mono text-[11px] text-[#4B6354]">${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}</td>
              <td class="p-3 text-[#4B6354]">${c.contactDetails || 'N/A'}</td>
              <td class="p-3 text-[11px] text-emerald-800 font-medium">${(c.acceptedWasteCategories || []).slice(0, 3).join(', ')}...</td>
              <td class="p-3">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  ${c.verificationStatus}
                </span>
              </td>
            </tr>
          `).join('');
        }
      } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-xs text-rose-600">Failed to load collection centres.</td></tr>`;
      }
    }

    function openAddCentreModal() {
      document.getElementById('add-centre-modal')?.classList.remove('hidden');
    }

    function closeAddCentreModal() {
      document.getElementById('add-centre-modal')?.classList.add('hidden');
    }

    async function handleAddCentre(e) {
      e.preventDefault();
      const name = document.getElementById('centre-name').value.trim();
      const address = document.getElementById('centre-address').value.trim();
      const latitude = parseFloat(document.getElementById('centre-lat').value);
      const longitude = parseFloat(document.getElementById('centre-lng').value);
      const contactDetails = document.getElementById('centre-contact').value.trim();

      const selectedBoxes = Array.from(document.querySelectorAll('input[name="acceptedWaste"]:checked'));
      const acceptedWasteCategories = selectedBoxes.map(b => b.value);

      const btn = document.getElementById('centre-submit-btn');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        const res = await fetch('/api/admin/collection-centres', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AppState.token}`
          },
          body: JSON.stringify({
            name,
            address,
            latitude,
            longitude,
            contactDetails,
            acceptedWasteCategories
          })
        });
        const data = await res.json();

        if (data.success) {
          showToast('Collection centre registered successfully!', 'success');
          closeAddCentreModal();
          loadAdminCentres();
        } else {
          showToast(data.error || 'Failed to save centre.', 'error');
        }
      } catch (err) {
        showToast('Communication error with server.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Collection Centre';
      }
    }

    async function loadAdminAudit() {
      const tbody = document.getElementById('admin-audit-table-body');
      if (!tbody) return;

      const pickupId = document.getElementById('admin-audit-search-input')?.value.trim() || '';
      tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-xs text-[#4B6354]"><span class="inline-block animate-spin mr-1">◌</span> Querying statutory chain-of-custody ledger...</td></tr>`;

      try {
        const params = new URLSearchParams({ limit: 50 });
        if (pickupId) params.append('pickupId', pickupId);

        const res = await fetch(`/api/admin/audit-trail?${params.toString()}`, {
          headers: { Authorization: `Bearer ${AppState.token}` }
        });
        const data = await res.json();

        if (data.success && Array.isArray(data.data)) {
          if (data.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-xs text-[#4B6354]">No audit records found matching reference ID.</td></tr>`;
            return;
          }

          tbody.innerHTML = data.data.map(h => `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="p-3 text-[11px] text-[#4B6354] whitespace-nowrap">${new Date(h.timestamp).toLocaleString()}</td>
              <td class="p-3 font-bold text-[#1C2B22]">${h.pickupRequestId}</td>
              <td class="p-3 text-[11px] text-[#4B6354]">${h.previousStatus || '—'}</td>
              <td class="p-3 font-bold text-xs text-emerald-800">${h.newStatus}</td>
              <td class="p-3 font-mono text-[10px] text-[#4B6354]">${h.changedBy || 'SYSTEM'}</td>
              <td class="p-3 text-xs text-[#4B6354]">${h.reason || 'Status updated'}</td>
            </tr>
          `).join('');
        }
      } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-xs text-rose-600">Failed to query audit trail.</td></tr>`;
      }
    }
'''

# Also update loadCollectorDashboard to render the collection history table!
old_load_collector = "async function loadCollectorDashboard() {"
assert old_load_collector in code

# Let's inspect where loadCollectorDashboard ends or update it cleanly
code = code.replace(target_marker, js_to_insert + "\n    " + target_marker)

# Update Escape key listener to close new modals as well
old_escape = "closeConfirmDialog();"
new_escape = """closeConfirmDialog();
        closePickupDetailsModal();
        closeProvisionAdminModal();
        closeAddCentreModal();"""

code = code.replace(old_escape, new_escape, 1)

with open('code.html', 'w', encoding='utf-8') as f:
    f.write(code)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated code.html and index.html successfully!")
