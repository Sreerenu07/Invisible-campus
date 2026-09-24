/* =========================================================
   INVISIBLE CAMPUS — Jaya Engineering College
   Single Page Application Controller & API Synchronizer
   ========================================================= */

// Global State Caches
let currentSection = 'dashboard';
let reportsCache = [];
let hotspotsCache = [];
let statsCache = {};
let activeReportFilter = 'all';
let reportSearchQuery = '';
let cvSuggestedCategory = null;

// Building map configuration
const MAP_BUILDINGS = [
    { id: 'Auditorium', name: 'Auditorium' },
    { id: 'Canteen', name: 'Canteen' },
    { id: 'MainBlock', name: 'Main Block' },
    { id: 'Mech', name: 'Mech' },
    { id: 'Civil', name: 'Civil Block' },
    { id: 'ECE', name: 'ECE Block' },
    { id: 'Aero', name: 'Aero' },
    { id: 'CSE', name: 'CSE Block' },
    { id: 'Library', name: 'Library Block' }
];

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initFileUploadAndCv();
    initFormSubmit();
    initSearchAndFilter();
    initMobileMenu();

    // Render static map schematic structure
    renderCampusMaps();
    
    // Fetch initial data
    refreshAllData();
});

/* ---------------------------------------------------------
   NAVIGATION & SECTION SWITCHING
   --------------------------------------------------------- */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            navigateToSection(section);
        });
    });
}

function navigateToSection(sectionId) {
    currentSection = sectionId;

    // Update active navbar item
    document.querySelectorAll('.nav-item').forEach(btn => {
        if (btn.getAttribute('data-section') === sectionId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Hide all sections, display target
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });

    const targetSection = document.getElementById(`section-${sectionId}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update page title
    const titleMap = {
        'dashboard': 'Campus Infrastructure Intelligence',
        'report': 'Report Infrastructure Issue',
        'my-reports': 'My Reports',
        'campus-map': 'Campus Map Schematic',
        'hotspots': 'Recurring Hotspots',
        'maintenance': 'Maintenance Tasks'
    };
    
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle && titleMap[sectionId]) {
        pageTitle.textContent = titleMap[sectionId];
    }

    // Close mobile menu
    document.getElementById('sidebar')?.classList.remove('mobile-open');

    // Trigger full refresh
    refreshAllData();
}

function initMobileMenu() {
    const toggle = document.getElementById('mobileToggle');
    const sidebar = document.getElementById('sidebar');
    if (toggle && sidebar) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }
}

/* ---------------------------------------------------------
   DATA FETCHING & BACKEND SYNCHRONIZATION
   --------------------------------------------------------- */
async function refreshAllData() {
    // Render skeleton placeholders before fetching
    renderSkeletons();

    await Promise.all([
        fetchStats(),
        fetchHotspots(),
        fetchReports()
    ]);

    // Update Campus Map Hotspot Badges
    updateMapHotspotBadges();

    // Update Dynamic Campus Intelligence Panel
    updateCampusIntelligencePanel();
}

function renderSkeletons() {
    const dashboardRecent = document.getElementById('dashboard-recent-reports-body');
    if (dashboardRecent && reportsCache.length === 0) {
        dashboardRecent.innerHTML = `
            <tr>
                <td colspan="5"><div class="skeleton" style="height: 20px; width: 100%;"></div></td>
            </tr>`;
    }
}

async function fetchStats() {
    try {
        const res = await fetch('/api/stats');
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();
        statsCache = data;

        // Dashboard Stats
        document.getElementById('stat-total').textContent = data.total || 0;
        document.getElementById('stat-pending').textContent = data.pending || 0;
        document.getElementById('stat-in-progress').textContent = data.in_progress || 0;
        document.getElementById('stat-resolved').textContent = data.resolved || 0;
    } catch (err) {
        console.error('Error fetching stats:', err);
    }
}

async function fetchHotspots() {
    try {
        const res = await fetch('/api/hotspots');
        if (!res.ok) throw new Error('Failed to fetch hotspots');
        const data = await res.json();
        hotspotsCache = data.hotspots || [];

        renderDashboardHotspots(hotspotsCache);
        renderFullHotspots(hotspotsCache);
    } catch (err) {
        console.error('Error fetching hotspots:', err);
    }
}

async function fetchReports() {
    try {
        const res = await fetch('/api/reports');
        if (!res.ok) throw new Error('Failed to fetch reports');
        const data = await res.json();
        reportsCache = data;

        renderDashboardRecentReports(reportsCache);
        renderMyReports(reportsCache);
        renderMaintenanceKanban(reportsCache);
    } catch (err) {
        console.error('Error fetching reports:', err);
    }
}

/* ---------------------------------------------------------
   CAMPUS INTELLIGENCE PANEL GENERATOR
   --------------------------------------------------------- */
function updateCampusIntelligencePanel() {
    const textEl = document.getElementById('intelligenceText');
    const timeEl = document.getElementById('intelligenceTime');

    if (!textEl) return;

    const now = new Date();
    if (timeEl) {
        timeEl.textContent = `Updated ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    if (hotspotsCache.length > 0) {
        const topHotspot = hotspotsCache[0];
        const domCat = topHotspot.dominant_category || 'infrastructure';
        textEl.innerHTML = `<strong>${escapeHtml(topHotspot.building)}</strong> has ${topHotspot.total_reports} reported issues (dominant category: <strong>${escapeHtml(domCat)}</strong>) and requires urgent maintenance attention.`;
    } else if (statsCache.pending > 0) {
        textEl.innerHTML = `There are currently <strong>${statsCache.pending} pending infrastructure issue(s)</strong> awaiting maintenance triage across campus.`;
    } else if (statsCache.total > 0) {
        textEl.innerHTML = `All reported campus issues have been processed. No emerging hotspots currently detected across Jaya Engineering College.`;
    } else {
        textEl.innerHTML = `Campus infrastructure monitoring active. Submit issues to track spatial defect hotspots in real time.`;
    }
}

/* ---------------------------------------------------------
   RENDER FUNCTIONS
   --------------------------------------------------------- */
// 1. Dashboard Recent Reports Table
function renderDashboardRecentReports(reports) {
    const tbody = document.getElementById('dashboard-recent-reports-body');
    if (!tbody) return;

    if (reports.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-state-title">No reports yet</div>
                    <div class="empty-state-desc">Submitted campus issues will appear here.</div>
                </td>
            </tr>`;
        return;
    }

    const recent = reports.slice(0, 5);
    tbody.innerHTML = recent.map(r => `
        <tr>
            <td><strong>#IC-${r.id}</strong></td>
            <td>${escapeHtml(r.category)}</td>
            <td>${escapeHtml(r.building)} ${r.room !== 'N/A' ? `(${escapeHtml(r.room)})` : ''}</td>
            <td style="font-size: 0.82rem; color: var(--text-muted);">${escapeHtml(r.created_at)}</td>
            <td><span class="status-badge ${getStatusBadgeClass(r.status)}">${escapeHtml(r.status)}</span></td>
        </tr>
    `).join('');
}

// 2. Dashboard Emerging Hotspots List
function renderDashboardHotspots(hotspots) {
    const container = document.getElementById('dashboard-hotspots-list');
    if (!container) return;

    if (hotspots.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-title">No recurring infrastructure hotspots detected yet</div>
                <div class="empty-state-desc">Repeated reports (2 or more) from the same location will appear here.</div>
            </div>`;
        return;
    }

    container.innerHTML = hotspots.slice(0, 3).map(h => `
        <div class="hotspot-card-sm" onclick="openBuildingModalByName('${escapeHtml(h.building)}')">
            <div class="hotspot-info-sm">
                <h4>${escapeHtml(h.building)}</h4>
                <p>Dominant Category: <strong>${escapeHtml(h.dominant_category || 'General')}</strong> &bull; ${h.pending} pending</p>
            </div>
            <span class="hotspot-badge-sm">${h.total_reports} Reports</span>
        </div>
    `).join('');
}

// 3. Full Hotspots Section Grid
function renderFullHotspots(hotspots) {
    const container = document.getElementById('full-hotspots-container');
    if (!container) return;

    if (hotspots.length === 0) {
        container.innerHTML = `
            <div class="panel-card empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-title">No recurring infrastructure hotspots detected yet</div>
                <div class="empty-state-desc">Locations with repeated reports (2 or more) are surfaced automatically so maintenance teams can prioritize recurring issues.</div>
            </div>`;
        return;
    }

    container.innerHTML = hotspots.map(h => {
        const severityPercent = Math.min(100, (h.total_reports / 5) * 100);
        return `
            <div class="hotspot-full-card">
                <div class="hotspot-card-header">
                    <h3 class="hotspot-building-name">${escapeHtml(h.building)}</h3>
                    <span class="hotspot-count-pill">${h.total_reports} Reports</span>
                </div>
                
                <div class="hotspot-recurring-tag">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
                    Emerging Hotspot &bull; Dominant: <strong>${escapeHtml(h.dominant_category || 'General')}</strong>
                </div>

                <!-- Severity Progress Bar -->
                <div class="severity-bar-wrapper">
                    <div class="severity-label-row">
                        <span>Severity Indicator</span>
                        <span>${h.total_reports >= 3 ? 'High Priority' : 'Moderate Priority'}</span>
                    </div>
                    <div class="severity-track">
                        <div class="severity-fill" style="width: ${severityPercent}%;"></div>
                    </div>
                </div>

                <div class="hotspot-categories-list">
                    ${(h.categories || []).map(c => `<span class="category-pill">${escapeHtml(c)}</span>`).join('')}
                </div>

                <button class="btn btn-primary" style="font-size: 0.82rem; padding: 8px 14px; width: 100%;" onclick="openBuildingModalByName('${escapeHtml(h.building)}')">
                    View Location Details & Reports (${h.total_reports})
                </button>
            </div>
        `;
    }).join('');
}

// 4. My Reports List with Search & Filtering
function initSearchAndFilter() {
    const searchInput = document.getElementById('reportSearchInput');
    const filterPills = document.querySelectorAll('.filter-pill');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            reportSearchQuery = e.target.value.toLowerCase();
            renderMyReports(reportsCache);
        });
    }

    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeReportFilter = pill.getAttribute('data-filter');
            renderMyReports(reportsCache);
        });
    });
}

function renderMyReports(reports) {
    const container = document.getElementById('my-reports-list');
    if (!container) return;

    let filtered = reports.filter(r => {
        // Status filter
        if (activeReportFilter !== 'all' && r.status !== activeReportFilter) {
            return false;
        }
        // Search filter
        if (reportSearchQuery) {
            const q = reportSearchQuery;
            const matchId = `#ic-${r.id}`.includes(q) || String(r.id).includes(q);
            const matchBuilding = r.building.toLowerCase().includes(q);
            const matchCategory = r.category.toLowerCase().includes(q);
            const matchDesc = r.description.toLowerCase().includes(q);
            return matchId || matchBuilding || matchCategory || matchDesc;
        }
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="panel-card empty-state">
                <div class="empty-state-title">No reports found</div>
                <div class="empty-state-desc">No reports match the selected search or filter criteria.</div>
            </div>`;
        return;
    }

    container.innerHTML = filtered.map(r => `
        <div class="report-card">
            ${r.image_path ? `<img src="${r.image_path}" class="report-thumb" alt="Report image">` : ''}
            <div class="report-details">
                <div class="report-top-row">
                    <span class="report-category">${escapeHtml(r.category)}</span>
                    <span class="status-badge ${getStatusBadgeClass(r.status)}">${escapeHtml(r.status)}</span>
                </div>
                <div class="report-location">
                    Location: <strong>${escapeHtml(r.building)}</strong> ${r.room !== 'N/A' ? `— Room: ${escapeHtml(r.room)}` : ''}
                </div>
                <div class="report-description">
                    ${escapeHtml(r.description)}
                </div>
                <div class="report-footer">
                    <span>ID: #IC-${r.id}</span>
                    <span>Date: ${escapeHtml(r.created_at)}</span>
                    ${r.assigned_team ? `<span class="assigned-team-badge">Assigned: ${escapeHtml(r.assigned_team)}</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// 5. Maintenance Operations 3-Column Kanban Board
function renderMaintenanceKanban(reports) {
    const pendingWrapper = document.getElementById('kanban-pending-list');
    const inProgressWrapper = document.getElementById('kanban-in-progress-list');
    const resolvedWrapper = document.getElementById('kanban-resolved-list');

    const countPending = document.getElementById('kanban-count-pending');
    const countInProgress = document.getElementById('kanban-count-in-progress');
    const countResolved = document.getElementById('kanban-count-resolved');

    if (!pendingWrapper || !inProgressWrapper || !resolvedWrapper) return;

    const pending = reports.filter(r => r.status === 'Pending');
    const inProgress = reports.filter(r => r.status === 'In Progress');
    const resolved = reports.filter(r => r.status === 'Resolved');

    if (countPending) countPending.textContent = pending.length;
    if (countInProgress) countInProgress.textContent = inProgress.length;
    if (countResolved) countResolved.textContent = resolved.length;

    // Render Pending Column
    if (pending.length === 0) {
        pendingWrapper.innerHTML = `<div class="empty-state"><div class="empty-state-desc">No pending tasks</div></div>`;
    } else {
        pendingWrapper.innerHTML = pending.map(r => renderKanbanCard(r)).join('');
    }

    // Render In Progress Column
    if (inProgress.length === 0) {
        inProgressWrapper.innerHTML = `<div class="empty-state"><div class="empty-state-desc">No tasks in progress</div></div>`;
    } else {
        inProgressWrapper.innerHTML = inProgress.map(r => renderKanbanCard(r)).join('');
    }

    // Render Resolved Column
    if (resolved.length === 0) {
        resolvedWrapper.innerHTML = `<div class="empty-state"><div class="empty-state-desc">No resolved tasks yet</div></div>`;
    } else {
        resolvedWrapper.innerHTML = resolved.map(r => renderKanbanCard(r)).join('');
    }
}

function renderKanbanCard(report) {
    return `
        <div class="kanban-task-card">
            <div class="kt-header">
                <span class="kt-category">${escapeHtml(report.category)}</span>
                <span class="kt-id">#IC-${report.id}</span>
            </div>
            <div class="kt-location">${escapeHtml(report.building)} ${report.room !== 'N/A' ? `(${escapeHtml(report.room)})` : ''}</div>
            <p class="kt-desc">${escapeHtml(report.description)}</p>
            ${report.image_path ? `<img src="${report.image_path}" class="report-thumb mb-8" style="width: 100%; height: 110px;" alt="Task photo">` : ''}
            
            <div class="kt-actions">
                ${renderKanbanActionControls(report)}
            </div>
        </div>
    `;
}

function renderKanbanActionControls(report) {
    if (report.status === 'Pending') {
        return `
            <select id="team-select-${report.id}" class="team-select">
                <option value="" disabled selected>Select Maintenance Team...</option>
                <option value="Electrical Team">Electrical Team</option>
                <option value="Plumbing Team">Plumbing Team</option>
                <option value="Civil Team">Civil Team</option>
                <option value="General Maintenance">General Maintenance</option>
            </select>
            <button class="btn-assign" onclick="assignTask(${report.id})">Assign Team</button>
        `;
    } else if (report.status === 'In Progress') {
        return `
            <div class="assigned-team-badge" style="font-size: 0.78rem; text-align:center; margin-bottom: 4px;">Assigned: ${escapeHtml(report.assigned_team || 'Maintenance')}</div>
            <button class="btn-resolve" onclick="resolveTask(${report.id})">Mark Resolved</button>
        `;
    } else {
        return `<div class="badge-completed">Completed</div>`;
    }
}

async function assignTask(reportId) {
    const select = document.getElementById(`team-select-${reportId}`);
    if (!select || !select.value) {
        showToast('Please select a maintenance team before assigning.');
        return;
    }

    const team = select.value;
    try {
        const res = await fetch(`/api/reports/${reportId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'In Progress',
                assigned_team: team
            })
        });

        if (!res.ok) throw new Error('Failed to assign task');

        showToast(`Maintenance team assigned: ${team}`);
        refreshAllData();
    } catch (err) {
        console.error('Error assigning task:', err);
        showToast('Error updating maintenance task.');
    }
}

async function resolveTask(reportId) {
    try {
        const res = await fetch(`/api/reports/${reportId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'Resolved'
            })
        });

        if (!res.ok) throw new Error('Failed to resolve task');

        showToast(`Issue #IC-${reportId} marked as resolved.`);
        refreshAllData();
    } catch (err) {
        console.error('Error resolving task:', err);
        showToast('Error resolving task.');
    }
}

/* ---------------------------------------------------------
   EXACT SCHEMATIC MAP RENDERER
   --------------------------------------------------------- */
function renderCampusMaps() {
    const mainMap = document.getElementById('main-campus-map');
    const dashMap = document.getElementById('dash-map-container');

    const mapHTML = `
        <div class="map-layout-grid">
            <div class="road-vertical"></div>
            <div class="road-horizontal-left"></div>
            <div class="road-horizontal-right"></div>

            <!-- Top -->
            <div class="building-node" id="node-Auditorium" onclick="openBuildingModalByName('Auditorium')">
                <span class="building-title">AUDITORIUM</span>
                <span class="building-badge" id="badge-Auditorium">0 Reports</span>
            </div>

            <!-- Upper Left -->
            <div class="building-node" id="node-Canteen" onclick="openBuildingModalByName('Canteen')">
                <span class="building-title">CANTEEN</span>
                <span class="building-badge" id="badge-Canteen">0 Reports</span>
            </div>

            <!-- Central -->
            <div class="building-node" id="node-MainBlock" onclick="openBuildingModalByName('Main Block')">
                <span class="building-title">MAIN BLOCK</span>
                <span class="building-badge" id="badge-MainBlock">0 Reports</span>
            </div>

            <!-- Right of Central Road -->
            <div class="building-node" id="node-Mech" onclick="openBuildingModalByName('Mech')">
                <span class="building-title">MECH</span>
                <span class="building-badge" id="badge-Mech">0 Reports</span>
            </div>

            <div class="building-node" id="node-Civil" onclick="openBuildingModalByName('Civil Block')">
                <span class="building-title">CIVIL</span>
                <span class="building-badge" id="badge-Civil">0 Reports</span>
            </div>

            <!-- Lower Left -->
            <div class="building-node" id="node-ECE" onclick="openBuildingModalByName('ECE Block')">
                <span class="building-title">ECE</span>
                <span class="building-badge" id="badge-ECE">0 Reports</span>
            </div>

            <div class="building-node" id="node-Aero" onclick="openBuildingModalByName('Aero')">
                <span class="building-title">AERO</span>
                <span class="building-badge" id="badge-Aero">0 Reports</span>
            </div>

            <div class="building-node" id="node-CSE" onclick="openBuildingModalByName('CSE Block')">
                <span class="building-title">CSE</span>
                <span class="building-badge" id="badge-CSE">0 Reports</span>
            </div>

            <!-- Lower Right -->
            <div class="building-node" id="node-Library" onclick="openBuildingModalByName('Library Block')">
                <span class="building-title">LIBRARY</span>
                <span class="building-badge" id="badge-Library">0 Reports</span>
            </div>
        </div>
    `;

    if (mainMap) mainMap.innerHTML = mapHTML;
    if (dashMap) dashMap.innerHTML = mapHTML;
}

function updateMapHotspotBadges() {
    const nodeMap = {
        'Auditorium': 'Auditorium',
        'Canteen': 'Canteen',
        'Main Block': 'MainBlock',
        'Mech': 'Mech',
        'Civil Block': 'Civil',
        'ECE Block': 'ECE',
        'Aero': 'Aero',
        'CSE Block': 'CSE',
        'Library Block': 'Library'
    };

    const counts = {};
    reportsCache.forEach(r => {
        counts[r.building] = (counts[r.building] || 0) + 1;
    });

    Object.keys(nodeMap).forEach(buildingName => {
        const domId = nodeMap[buildingName];
        const count = counts[buildingName] || 0;
        const isHotspot = count >= 2;

        const nodes = document.querySelectorAll(`#node-${domId}`);
        nodes.forEach(node => {
            const badge = node.querySelector('.building-badge');
            if (badge) {
                badge.textContent = `${count} ${count === 1 ? 'Report' : 'Reports'}`;
            }

            if (isHotspot) {
                node.classList.add('is-hotspot');
            } else {
                node.classList.remove('is-hotspot');
            }
        });
    });
}

/* ---------------------------------------------------------
   REPORT FORM & OPENCV INTEGRATION
   --------------------------------------------------------- */
function initFileUploadAndCv() {
    const fileInput = document.getElementById('reportImage');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const previewImg = document.getElementById('imagePreview');
    const removeBtn = document.getElementById('removeImgBtn');
    const uploadContent = document.getElementById('fileUploadContent');
    const fileNameText = document.getElementById('fileNameText');
    const cvBox = document.getElementById('cvSuggestionBox');
    const cvText = document.getElementById('cvSuggestionText');
    const applyCvBtn = document.getElementById('applyCvSuggestionBtn');

    if (!fileInput) return;

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (fileNameText) fileNameText.textContent = file.name;

            const reader = new FileReader();
            reader.onload = (event) => {
                previewImg.src = event.target.result;
                previewContainer.classList.remove('hidden');
                uploadContent.classList.add('hidden');
            };
            reader.readAsDataURL(file);

            // Call OpenCV Analysis Endpoint
            if (cvBox && cvText) {
                cvBox.classList.remove('hidden');
                cvText.textContent = 'OpenCV analyzing image texture & colors...';

                const formData = new FormData();
                formData.append('image', file);

                try {
                    const res = await fetch('/api/analyze-image', {
                        method: 'POST',
                        body: formData
                    });

                    if (res.ok) {
                        const data = await res.json();
                        cvSuggestedCategory = data.suggested_category;
                        cvText.textContent = `Suggested Category: ${data.suggested_category} (${data.explanation})`;
                    } else {
                        cvBox.classList.add('hidden');
                    }
                } catch (err) {
                    console.error('CV Error:', err);
                    cvBox.classList.add('hidden');
                }
            }
        }
    });

    removeBtn?.addEventListener('click', () => {
        fileInput.value = '';
        previewContainer.classList.add('hidden');
        uploadContent.classList.remove('hidden');
        cvBox.classList.add('hidden');
        cvSuggestedCategory = null;
    });

    applyCvBtn?.addEventListener('click', () => {
        if (cvSuggestedCategory) {
            const catSelect = document.getElementById('reportCategory');
            if (catSelect) {
                catSelect.value = cvSuggestedCategory;
                showToast(`Category set to ${cvSuggestedCategory}`);
            }
        }
    });
}

function initFormSubmit() {
    const form = document.getElementById('reportForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submitReportBtn');
        if (submitBtn) submitBtn.disabled = true;

        const formData = new FormData(form);

        try {
            const res = await fetch('/api/reports', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (res.ok) {
                showToast('Report submitted successfully.');
                form.reset();

                // Clear photo preview
                document.getElementById('removeImgBtn')?.click();

                // Synchronize data and navigate to My Reports
                await refreshAllData();
                navigateToSection('my-reports');
            } else {
                showToast(data.error || 'Failed to submit report.');
            }
        } catch (err) {
            console.error('Submission error:', err);
            showToast('Server error while submitting report.');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}

/* ---------------------------------------------------------
   BUILDING DETAILS MODAL
   --------------------------------------------------------- */
async function openBuildingModalByName(buildingName) {
    const modal = document.getElementById('buildingModal');
    const title = document.getElementById('modalBuildingName');
    const badge = document.getElementById('modalHotspotBadge');
    const countEl = document.getElementById('modalReportCount');
    const pendingEl = document.getElementById('modalPendingCount');
    const inProgressEl = document.getElementById('modalInProgressCount');
    const resolvedEl = document.getElementById('modalResolvedCount');
    const domCatEl = document.getElementById('modalDominantCat');
    const listEl = document.getElementById('modalReportsList');

    if (!modal) return;

    title.textContent = buildingName;
    listEl.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">Loading building details...</p>';
    modal.classList.remove('hidden');

    try {
        const res = await fetch(`/api/buildings/${encodeURIComponent(buildingName)}`);
        if (!res.ok) throw new Error('Failed to fetch building details');
        const data = await res.json();

        if (countEl) countEl.textContent = data.report_count;
        if (pendingEl) pendingEl.textContent = data.pending_count || 0;
        if (inProgressEl) inProgressEl.textContent = data.in_progress_count || 0;
        if (resolvedEl) resolvedEl.textContent = data.resolved_count || 0;
        if (domCatEl) domCatEl.textContent = data.dominant_category || 'None';

        if (data.is_hotspot) {
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }

        if (data.reports.length === 0) {
            listEl.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No reports logged for this building location.</p>';
        } else {
            listEl.innerHTML = data.reports.map(r => `
                <div class="modal-report-item">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
                        <strong>${escapeHtml(r.category)} (#IC-${r.id})</strong>
                        <span class="status-badge ${getStatusBadgeClass(r.status)}">${escapeHtml(r.status)}</span>
                    </div>
                    <p style="color: var(--text-dark); margin-bottom: 4px;">${escapeHtml(r.description)}</p>
                    <small style="color: var(--text-muted);">Area: ${escapeHtml(r.room)} &bull; ${escapeHtml(r.created_at)}</small>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Modal error:', err);
        listEl.innerHTML = '<p style="color: var(--dusty-pink-dark); font-size: 0.85rem;">Error loading details.</p>';
    }
}

function closeBuildingModal() {
    document.getElementById('buildingModal')?.classList.add('hidden');
}

/* ---------------------------------------------------------
   TOAST & HELPERS
   --------------------------------------------------------- */
function showToast(message, duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'Pending': return 'status-pending';
        case 'In Progress': return 'status-in-progress';
        case 'Resolved': return 'status-resolved';
        default: return 'status-pending';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
