// State Management
let state = {
    currentView: 'grid',
    currentHalfMonth: 0, // 0-23 (12 months × 2 halves)
    filters: {
        search: '',
        showFlowers: true,
        activity: 'all',
        month: 'all'
    },
    filteredPlants: [...PLANTS]
};

// DOM Elements
const elements = {
    // View buttons
    gridViewBtn: document.getElementById('gridViewBtn'),
    timelineViewBtn: document.getElementById('timelineViewBtn'),
    monthViewBtn: document.getElementById('monthViewBtn'),

    // Views
    gridView: document.getElementById('gridView'),
    timelineView: document.getElementById('timelineView'),
    monthView: document.getElementById('monthView'),

    // Filter controls
    searchInput: document.getElementById('searchInput'),
    showFlowersCheckbox: document.getElementById('showFlowers'),
    activityFilter: document.getElementById('activityFilter'),
    monthFilter: document.getElementById('monthFilter'),
    resetFilters: document.getElementById('resetFilters'),

    // Content containers
    gridTable: document.getElementById('gridTable'),
    gridTableBody: document.getElementById('gridTableBody'),
    timelineContainer: document.getElementById('timelineContainer'),
    monthContent: document.getElementById('monthContent'),
    currentMonthTitle: document.getElementById('currentMonthTitle'),
    resultsSummary: document.getElementById('resultsSummary'),

    // Month navigation
    prevMonth: document.getElementById('prevMonth'),
    nextMonth: document.getElementById('nextMonth')
};

const PREFERRED_VIEW_ORDER = ['grid', 'timeline', 'month'];

const viewUI = {};
if (elements.gridViewBtn && elements.gridView) {
    viewUI.grid = { tab: elements.gridViewBtn, panel: elements.gridView };
}
if (elements.timelineViewBtn && elements.timelineView) {
    viewUI.timeline = { tab: elements.timelineViewBtn, panel: elements.timelineView };
}
if (elements.monthViewBtn && elements.monthView) {
    viewUI.month = { tab: elements.monthViewBtn, panel: elements.monthView };
}

const VIEW_ORDER = PREFERRED_VIEW_ORDER.filter(view => viewUI[view]);

function updateResultsSummary() {
    if (!elements.resultsSummary) return;

    const total = PLANTS.length;
    const shown = state.filteredPlants.length;

    const filters = [];
    if (state.filters.search) filters.push(`search: "${state.filters.search}"`);
    if (!state.filters.showFlowers) filters.push('flowers hidden');
    if (state.filters.activity !== 'all') filters.push(`activity: ${state.filters.activity.toUpperCase()}`);

    elements.resultsSummary.textContent = filters.length
        ? `Showing ${shown} of ${total} plants. Filters: ${filters.join(', ')}.`
        : `Showing ${shown} of ${total} plants.`;
}


function applyNowEmphasisToGrid() {
    const table = elements.gridTable;
    if (!table) return;

    table.querySelectorAll('.is-now, .is-current-month').forEach(el => {
        el.classList.remove('is-now', 'is-current-month');
    });

    table.querySelectorAll('td.is-now-col').forEach(td => {
        td.classList.remove('is-now-col');
    });

    const today = new Date();
    const monthIndex = today.getMonth();
    const halfIndex = today.getDate() <= 15 ? 0 : 1;

    // Month group header (Jan/Feb/...)
    const monthHeaderRow = table.querySelector('thead tr:first-child');
    if (monthHeaderRow) {
        const monthGroupCell = monthHeaderRow.children[1 + monthIndex];
        if (monthGroupCell) monthGroupCell.classList.add('is-current-month');
    }

    // Half-month header (1-15 / 16-..)
    const halfHeaderRow = table.querySelector('thead tr.half-month-header');
    if (halfHeaderRow) {
        const halfCellIndex = 1 + (monthIndex * 2) + halfIndex;
        const halfCell = halfHeaderRow.children[halfCellIndex];
        if (halfCell) halfCell.classList.add('is-now');
    }

    // Body column
    const targetCol = 2 + (monthIndex * 2) + halfIndex; // 1=plant col
    const tbody = table.tBodies && table.tBodies.length ? table.tBodies[0] : table.querySelector('tbody');
    if (!tbody) return;

    Array.from(tbody.rows).forEach(row => {
        const cell = row.children[targetCol - 1];
        if (cell && cell.tagName === 'TD') cell.classList.add('is-now-col');
    });
}

function syncViewUI(view) {
    VIEW_ORDER.forEach(v => {
        const isActive = v === view;
        const { tab, panel } = viewUI[v];

        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
        tab.tabIndex = isActive ? 0 : -1;

        panel.classList.toggle('active', isActive);
        panel.hidden = !isActive;
    });
}

function handleTabKeydown(e) {
    const currentView = Object.keys(viewUI).find(v => viewUI[v].tab === e.currentTarget);
    if (!currentView) return;

    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();

    const currentIndex = VIEW_ORDER.indexOf(currentView);
    let nextView = currentView;

    if (e.key === 'ArrowLeft') nextView = VIEW_ORDER[(currentIndex - 1 + VIEW_ORDER.length) % VIEW_ORDER.length];
    if (e.key === 'ArrowRight') nextView = VIEW_ORDER[(currentIndex + 1) % VIEW_ORDER.length];
    if (e.key === 'Home') nextView = VIEW_ORDER[0];
    if (e.key === 'End') nextView = VIEW_ORDER[VIEW_ORDER.length - 1];

    switchView(nextView);
    viewUI[nextView].tab.focus();
}

// Helper Functions
function getActivityColor(activity) {
    const colors = {
        'si': 'activity-si',
        't': 'activity-t',
        's': 'activity-s',
        'sg': 'activity-sg',
        'tg': 'activity-tg',
        'h': 'activity-h'
    };
    return colors[activity] || 'activity-t';
}

function getActivityColorValue(activity) {
    const colors = {
        'si': '#5b8ec4',
        't': '#c1604a',
        's': '#8b9d77',
        'sg': '#4a7c8f',
        'tg': '#d97638',
        'h': '#daa520'
    };
    return colors[activity] || '#c1604a';
}

function createActivityBadge(activity) {
    return `<span class="activity-badge ${getActivityColor(activity)}">${activity}</span>`;
}

// SVG Icon Generator
function createSVGIcon(type, color) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "28");
    svg.setAttribute("height", "28");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.setAttribute("fill", "none");
    svg.style.display = "inline-block";
    svg.style.verticalAlign = "middle";

    const icons = {
        // 1. Arugula - serrated rocket leaves
        'arugula': `<path d="M10 2 L10 16" stroke="${color}" stroke-width="1.5" opacity="0.6"/><path d="M10 4 Q7 4.5 6 7 L5.5 7.5 L6 7.8 L6.5 7.5 L7 8 L7.5 7.7 L8 8.2 L8.5 7.9 L9 8.5 L10 8" fill="${color}"/><path d="M10 4 Q13 4.5 14 7 L14.5 7.5 L14 7.8 L13.5 7.5 L13 8 L12.5 7.7 L12 8.2 L11.5 7.9 L11 8.5 L10 8" fill="${color}"/><path d="M10 9 Q7.5 9.5 6.5 11.5 L6 12 L6.5 12.3 L7 12 L7.5 12.5 L8 12.2 L8.5 12.7 L9.5 12" fill="${color}"/><path d="M10 9 Q12.5 9.5 13.5 11.5 L14 12 L13.5 12.3 L13 12 L12.5 12.5 L12 12.2 L11.5 12.7 L10.5 12" fill="${color}"/>`,

        // 2. Lettuce head - side view with layered ruffled leaves spreading from base
        'lettuce-head': `<ellipse cx="10" cy="16.5" rx="4.5" ry="2" fill="${color}" opacity="0.3"/><path d="M10 16.5 Q6 15.5 4.5 12.5 Q3.5 9.5 4 6.5 Q4.5 4.5 6 4 Q7 4.5 8 6.5 Q8.5 8.5 9 11.5 L9.5 15.5" fill="${color}"/><path d="M10 16.5 Q14 15.5 15.5 12.5 Q16.5 9.5 16 6.5 Q15.5 4.5 14 4 Q13 4.5 12 6.5 Q11.5 8.5 11 11.5 L10.5 15.5" fill="${color}"/><path d="M6.5 5 Q6 6 5.8 7.5 Q5.5 9 6 10.5 Q6.5 12 7.5 13" stroke="${color}" stroke-width="0.8" opacity="0.5" fill="none"/><path d="M13.5 5 Q14 6 14.2 7.5 Q14.5 9 14 10.5 Q13.5 12 12.5 13" stroke="${color}" stroke-width="0.8" opacity="0.5" fill="none"/><path d="M9.2 15.5 Q7.5 14.5 6.5 12 Q5.8 9.5 6.5 7 Q7 5.5 8 5 Q8.5 6 9 8 Q9.2 10 9.2 12.5" fill="${color}" opacity="0.75"/><path d="M10.8 15.5 Q12.5 14.5 13.5 12 Q14.2 9.5 13.5 7 Q13 5.5 12 5 Q11.5 6 11 8 Q10.8 10 10.8 12.5" fill="${color}" opacity="0.75"/><path d="M7.5 6 Q7.2 7 7 8.5 Q6.8 10 7.2 11.5 M12.5 6 Q12.8 7 13 8.5 Q13.2 10 12.8 11.5" stroke="${color}" stroke-width="0.7" opacity="0.45" fill="none"/><path d="M9.5 14.5 Q8.5 13.5 8 11.5 Q7.5 9.5 8 7.5 Q8.5 6.5 9 6.3 Q9.3 7.5 9.4 9.5 Q9.5 11.5 9.5 13.5" fill="${color}" opacity="0.6"/><path d="M10.5 14.5 Q11.5 13.5 12 11.5 Q12.5 9.5 12 7.5 Q11.5 6.5 11 6.3 Q10.7 7.5 10.6 9.5 Q10.5 11.5 10.5 13.5" fill="${color}" opacity="0.6"/><path d="M8.5 7 Q8.3 8 8.2 9.5 Q8.1 10.5 8.3 11.5 M11.5 7 Q11.7 8 11.8 9.5 Q11.9 10.5 11.7 11.5" stroke="${color}" stroke-width="0.6" opacity="0.4" fill="none"/>`,

        // 3. Radishes - round root with leafy top
        'radish': `<circle cx="10" cy="12" r="5.5" fill="${color}"/><ellipse cx="10" cy="12" rx="4" ry="4.5" fill="${color}" opacity="0.8"/><circle cx="8" cy="10.5" r="1.3" fill="#ffffff" opacity="0.4"/><path d="M10 6.5 L10 8" stroke="${color}" stroke-width="1.5" opacity="0.8"/><path d="M8.5 3 Q8 4 8.5 5.5 L9 6.5" fill="#2a9d8f"/><path d="M10 2.5 Q9.5 3.5 10 5.5 L10 6.5" fill="#2a9d8f"/><path d="M11.5 3 Q12 4 11.5 5.5 L11 6.5" fill="#2a9d8f"/><path d="M8.5 3 Q8 4 8.5 5.5 M10 2.5 Q9.5 3.5 10 5.5 M11.5 3 Q12 4 11.5 5.5" stroke="#1d3557" stroke-width="0.5" opacity="0.3" fill="none"/><circle cx="10" cy="17" r="0.8" fill="${color}"/>`,

        // 4. Lettuce leaf - loose frilly leaves
        'lettuce-leaf': `<path d="M10 16 L10 6" stroke="${color}" stroke-width="1.2" opacity="0.5"/><path d="M10 7 Q6 7 5 10 Q4.5 11 5 12 L5.5 12.5 L5.2 13 L5.7 13.5 L5.4 14 L6 14.5 L6.5 14.3 L7 15 L8 14" fill="${color}"/><path d="M10 7 Q14 7 15 10 Q15.5 11 15 12 L14.5 12.5 L14.8 13 L14.3 13.5 L14.6 14 L14 14.5 L13.5 14.3 L13 15 L12 14" fill="${color}"/><path d="M10 10 Q7 10.5 6 13 L6.5 13.8 L6.2 14.5 L7 15 L7.5 14.8 L8.5 16 L9 15" fill="${color}" opacity="0.8"/><path d="M10 10 Q13 10.5 14 13 L13.5 13.8 L13.8 14.5 L13 15 L12.5 14.8 L11.5 16 L11 15" fill="${color}" opacity="0.8"/>`,

        // 5. Onions green (scallions) - thin stalks with white bulb base
        'scallion': `<rect x="8.5" y="3" width="1.5" height="11" rx="0.7" fill="${color}"/><rect x="10.5" y="2" width="1.5" height="12" rx="0.7" fill="${color}"/><ellipse cx="9.25" cy="14" rx="1.8" ry="3" fill="#f5f5f5"/><ellipse cx="11.25" cy="14" rx="1.8" ry="3" fill="#f5f5f5"/><path d="M8.5 14.5 L8.5 16.5 Q8.5 17 9.25 17 Q10 17 10 16.5 L10 14" stroke="#1d3557" stroke-width="0.3" opacity="0.2" fill="none"/><path d="M10.5 14.5 L10.5 17 Q10.5 17.5 11.25 17.5 Q12 17.5 12 17 L12 14" stroke="#1d3557" stroke-width="0.3" opacity="0.2" fill="none"/><line x1="8.8" y1="5" x2="9.8" y2="5" stroke="${color}" stroke-width="0.4" opacity="0.3"/><line x1="10.8" y1="6" x2="11.8" y2="6" stroke="${color}" stroke-width="0.4" opacity="0.3"/>`,

        // 6. Spinach - smooth rounded leaves
        'spinach': `<path d="M10 4 Q6 5 5 9 Q4 12 7 14 Q9 15 10 14" fill="${color}"/><path d="M10 4 Q14 5 15 9 Q16 12 13 14 Q11 15 10 14" fill="${color}"/><path d="M10 7 Q7 8 6.5 11 Q6 13 8.5 14.5 Q9.5 15 10 14.5" fill="${color}" opacity="0.7"/><path d="M10 7 Q13 8 13.5 11 Q14 13 11.5 14.5 Q10.5 15 10 14.5" fill="${color}" opacity="0.7"/><path d="M10 4 L10 14.5" stroke="#1d3557" stroke-width="0.8" opacity="0.3"/><path d="M10 6 Q7.5 7 7 9.5 M10 9 Q7.5 10 7 12" stroke="#1d3557" stroke-width="0.5" opacity="0.25"/><path d="M10 6 Q12.5 7 13 9.5 M10 9 Q12.5 10 13 12" stroke="#1d3557" stroke-width="0.5" opacity="0.25"/>`,

        // 7. Celery - bundled stalks with leaves
        'celery': `<path d="M7 16 Q7 12 7.5 8 L8 4 L8 3" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M10 17 Q10 13 10 8 L10 4 L10 2.5" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M13 16 Q13 12 12.5 8 L12 4 L12 3" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M8 3 Q7 2.5 6.5 3.5 L7 4.5 L7.5 4 L8 4.8" fill="#2a9d8f"/><path d="M10 2.5 Q9 2 8.5 3 L9 4 L9.5 3.5 L10 4.3" fill="#2a9d8f"/><path d="M12 3 Q11 2.5 10.5 3.5 L11 4.5 L11.5 4 L12 4.8" fill="#2a9d8f"/><path d="M7.5 7 Q7.3 6.8 7 7 M10 6 Q9.8 5.8 9.5 6 M12.5 7 Q12.3 6.8 12 7" stroke="#ffffff" stroke-width="0.6" opacity="0.3"/>`,

        // 8. Onions bulb - detailed layered bulb with papery layers and shoots
        'onion-bulb': `<ellipse cx="10" cy="12.5" rx="5.8" ry="6" fill="${color}"/><ellipse cx="10" cy="12.5" rx="5" ry="5.3" fill="${color}" opacity="0.85"/><ellipse cx="10" cy="12.5" rx="4.8" ry="5.1" fill="none" stroke="#1d3557" stroke-width="0.8" opacity="0.25"/><ellipse cx="10" cy="12.5" rx="3.8" ry="4.2" fill="none" stroke="#1d3557" stroke-width="0.8" opacity="0.25"/><ellipse cx="10" cy="12.5" rx="2.8" ry="3.2" fill="none" stroke="#1d3557" stroke-width="0.7" opacity="0.2"/><ellipse cx="10" cy="12.5" rx="1.8" ry="2.2" fill="none" stroke="#1d3557" stroke-width="0.6" opacity="0.15"/><path d="M10 6.5 Q10 12 10 12.5" stroke="#1d3557" stroke-width="0.4" opacity="0.15"/><circle cx="10" cy="17.8" r="0.8" fill="${color}" opacity="0.6"/><path d="M9.2 5.8 L9.2 6.8" stroke="#2a9d8f" stroke-width="2.2" stroke-linecap="round"/><path d="M10.8 5.3 L10.8 6.8" stroke="#2a9d8f" stroke-width="2.2" stroke-linecap="round"/><path d="M8 6.3 L8 7.3 M12 6.3 L12 7.3" stroke="#8b9d77" stroke-width="1.8" stroke-linecap="round"/><path d="M7 7 L7 7.8 M13 7 L13 7.8" stroke="#8b9d77" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>`,

        // 9. Leek - thick white stalk with fan leaves
        'leek': `<rect x="8" y="8" width="4" height="9" rx="1" fill="#f5f5f5" stroke="#d0d0d0" stroke-width="0.4"/><path d="M8.5 8.5 L8.5 16 M9.5 8.5 L9.5 16 M10.5 8.5 L10.5 16 M11.5 8.5 L11.5 16" stroke="#e5e5e5" stroke-width="0.5" opacity="0.4"/><path d="M8 8 Q7 7 7 5 L7.5 3" stroke="${color}" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M9 8 Q8.5 6.5 8.5 4.5 L9 2.5" stroke="${color}" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M10 8 Q10 6 10 4 L10 2" stroke="${color}" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M11 8 Q11.5 6.5 11.5 4.5 L11 2.5" stroke="${color}" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M12 8 Q13 7 13 5 L12.5 3" stroke="${color}" stroke-width="1.8" fill="none" stroke-linecap="round"/><ellipse cx="10" cy="16.5" rx="2.5" ry="1" fill="#e5e5e5" stroke="#d0d0d0" stroke-width="0.35"/>`,

        // 10. Kale - very curly deeply ruffled leaves with dense texture
        'kale': `<path d="M10 2 L10 16.5" stroke="${color}" stroke-width="1.8" opacity="0.5"/><path d="M10 4 Q6 4.5 4.8 8 Q4.5 8.7 4.8 9 Q4.6 9.5 4.9 9.8 Q4.7 10.2 5 10.5 Q4.8 11 5.1 11.3 Q4.9 11.7 5.2 12 Q4.9 12.4 5.3 12.7 Q6.2 13.2 8.5 12.5" fill="${color}"/><path d="M10 4 Q14 4.5 15.2 8 Q15.5 8.7 15.2 9 Q15.4 9.5 15.1 9.8 Q15.3 10.2 15 10.5 Q15.2 11 14.9 11.3 Q15.1 11.7 14.8 12 Q15.1 12.4 14.7 12.7 Q13.8 13.2 11.5 12.5" fill="${color}"/><circle cx="6.5" cy="9.5" r="0.9" fill="${color}" opacity="0.85"/><circle cx="7.5" cy="7.8" r="0.9" fill="${color}" opacity="0.85"/><circle cx="13.5" cy="9.5" r="0.9" fill="${color}" opacity="0.85"/><circle cx="12.5" cy="7.8" r="0.9" fill="${color}" opacity="0.85"/><path d="M10 9 Q6.5 9.5 5.3 13 Q5 13.7 5.3 14 Q5.1 14.5 5.4 14.8 Q5.2 15.2 5.5 15.5 Q5.3 16 5.6 16.3 Q6.5 17 8.8 16" fill="${color}" opacity="0.75"/><path d="M10 9 Q13.5 9.5 14.7 13 Q15 13.7 14.7 14 Q14.9 14.5 14.6 14.8 Q14.8 15.2 14.5 15.5 Q14.7 16 14.4 16.3 Q13.5 17 11.2 16" fill="${color}" opacity="0.75"/><circle cx="6.8" cy="14" r="0.8" fill="${color}" opacity="0.7"/><circle cx="7.8" cy="12.3" r="0.8" fill="${color}" opacity="0.7"/><circle cx="13.2" cy="14" r="0.8" fill="${color}" opacity="0.7"/><circle cx="12.2" cy="12.3" r="0.8" fill="${color}" opacity="0.7"/>`,

        // 11. Collard greens - large flat leaves
        'collard': `<path d="M10 3 L10 16" stroke="${color}" stroke-width="2" opacity="0.5"/><ellipse cx="7" cy="8" rx="4" ry="5" fill="${color}" transform="rotate(-15 7 8)"/><ellipse cx="13" cy="8" rx="4" ry="5" fill="${color}" transform="rotate(15 13 8)"/><ellipse cx="6.5" cy="12" rx="3.5" ry="4.5" fill="${color}" transform="rotate(-20 6.5 12)"/><ellipse cx="13.5" cy="12" rx="3.5" ry="4.5" fill="${color}" transform="rotate(20 13.5 12)"/><path d="M10 5 Q7 6 7 9 M10 8 Q7 9 6.5 12" stroke="#1d3557" stroke-width="0.6" opacity="0.3"/><path d="M10 5 Q13 6 13 9 M10 8 Q13 9 13.5 12" stroke="#1d3557" stroke-width="0.6" opacity="0.3"/>`,

        // 12. Bok choy - thick white stems with deep green rounded leaves
        'bokchoy': `<ellipse cx="10" cy="15" rx="4.5" ry="3.8" fill="#f5f5f5" stroke="#d0d0d0" stroke-width="0.4"/><path d="M6.8 10.8 Q6 11.5 6 13.5 L6 15.2 Q6 16 6.8 15.8 L6.8 10.8" fill="#f5f5f5" stroke="#d0d0d0" stroke-width="0.35"/><path d="M6.2 11 Q6 11.5 6 13.5 L6 15 Q6 15.5 6.5 15.5" fill="#e5e5e5" opacity="0.5"/><path d="M10 10.2 Q9.8 11 9.8 13.5 L9.8 16 Q9.8 16.8 10 16.8 L10 10.2" fill="#f5f5f5" stroke="#d0d0d0" stroke-width="0.35"/><path d="M9.5 10.5 Q9.3 11 9.3 13.5 L9.3 15.8 Q9.3 16.3 9.7 16.3" fill="#e5e5e5" opacity="0.5"/><path d="M13.2 10.8 Q14 11.5 14 13.5 L14 15.2 Q14 16 13.2 15.8 L13.2 10.8" fill="#f5f5f5" stroke="#d0d0d0" stroke-width="0.35"/><path d="M13.8 11 Q14 11.5 14 13.5 L14 15 Q14 15.5 13.5 15.5" fill="#e5e5e5" opacity="0.5"/><path d="M7 10.5 Q5.2 8.5 4.5 6 Q3.8 3.5 5.8 2.5 Q7.2 2 8.5 3.8 Q9.2 5.8 9.5 9.5" fill="${color}"/><ellipse cx="6.8" cy="6" rx="2.5" ry="3.5" fill="${color}" transform="rotate(-15 6.8 6)" opacity="0.9"/><path d="M10 9.8 Q9.5 7 8.8 4.8 Q8.2 2.5 10 1.8 Q11.5 1.5 12.2 3.5 Q12.8 6 12 9.8" fill="${color}"/><ellipse cx="10" cy="5.5" rx="2.3" ry="3.3" fill="${color}" opacity="0.9"/><path d="M13 10.5 Q14.8 8.5 15.5 6 Q16.2 3.5 14.2 2.5 Q12.8 2 11.5 3.8 Q10.8 5.8 10.5 9.5" fill="${color}"/><ellipse cx="13.2" cy="6" rx="2.5" ry="3.5" fill="${color}" transform="rotate(15 13.2 6)" opacity="0.9"/><path d="M7.5 4 Q7.5 6.5 8 9 M10 3.5 Q10 6 10.5 9 M12.5 4 Q12.5 6.5 12 9" stroke="#1d3557" stroke-width="0.6" opacity="0.3"/>`,

        // 13. Chard Swiss - colorful stems with leaves
        'chard': `<rect x="7.5" y="8" width="1.8" height="9" rx="0.9" fill="#e63946"/><rect x="9.8" y="7" width="1.8" height="10" rx="0.9" fill="#ffc300"/><rect x="12.1" y="8" width="1.8" height="9" rx="0.9" fill="#e63946"/><path d="M8.4 8 Q6.5 7 5.5 5 Q4.5 3 6 2 Q7.5 1.5 8.5 3.5 Q9 5.5 9 8" fill="${color}"/><path d="M10.7 7 Q9.5 6 9 4 Q8.5 2 10 1.5 Q11.5 1 12 3 Q12.5 5 12.5 7" fill="${color}"/><path d="M12.9 8 Q14.5 7 15 5 Q15.5 3 14 2 Q12.5 1.5 11.5 3.5 Q11 5.5 11.5 8" fill="${color}"/><path d="M7 3 Q7 5 7.5 7 M10.5 2.5 Q10.5 4.5 10.7 6.5 M13 3 Q13 5 12.5 7" stroke="#1d3557" stroke-width="0.5" opacity="0.25"/>`,

        // 14. Chives - thin grass-like stalks
        'chives': `<path d="M6 17 Q6 12 6.5 7 Q6.7 4 7 2" stroke="${color}" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M7.5 17.5 Q7.5 13 8 8 Q8.2 5 8.5 2.5" stroke="${color}" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M9 17 Q9 12 9.3 7 Q9.5 4 9.8 2" stroke="${color}" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M10.5 17.5 Q10.5 13 10.7 8 Q10.9 5 11 2.5" stroke="${color}" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M12 17 Q12 12 12.2 7 Q12.4 4 12.5 2" stroke="${color}" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M13.5 17.5 Q13.5 13 13.6 8 Q13.7 5 13.8 2.5" stroke="${color}" stroke-width="1.2" fill="none" stroke-linecap="round"/><circle cx="7" cy="2" r="1.2" fill="#9d84b7"/><circle cx="10" cy="1.8" r="1.2" fill="#9d84b7"/><circle cx="13" cy="2.2" r="1.2" fill="#9d84b7"/>`,

        // 15. Snap pea (bush) - very plump curved pod with prominent bulging peas
        'snappea': `<path d="M4.5 9.5 Q3.5 10.5 3.5 13 Q3.5 16 6.2 17 L14 17 Q16.5 16 16.5 13 Q16.5 10.5 15.5 9.5" fill="${color}"/><path d="M5.5 10 Q4.7 10.8 4.7 12.2 L4.7 14.2 Q4.7 15.8 6.5 16.3 L13.7 16.3 Q15.3 15.8 15.3 14.2 L15.3 12.2 Q15.3 10.8 14.5 10" fill="${color}" opacity="0.75"/><circle cx="7" cy="12.5" r="2.3" fill="#8b9d77" opacity="0.55"/><circle cx="7" cy="12.5" r="1.8" fill="#8b9d77" opacity="0.35"/><circle cx="10" cy="13" r="2.5" fill="#8b9d77" opacity="0.55"/><circle cx="10" cy="13" r="2" fill="#8b9d77" opacity="0.35"/><circle cx="13" cy="12.5" r="2.3" fill="#8b9d77" opacity="0.55"/><circle cx="13" cy="12.5" r="1.8" fill="#8b9d77" opacity="0.35"/><path d="M6 11 Q10 12 14 11" stroke="#1d3557" stroke-width="0.7" opacity="0.3"/><path d="M6 14.5 Q10 15.5 14 14.5" stroke="#1d3557" stroke-width="0.7" opacity="0.25"/><circle cx="7.8" cy="10.5" r="1.2" fill="#ffffff" opacity="0.35"/><path d="M15.5 9.5 Q15 7.5 13.8 5.8 L13.2 4.8" stroke="#2a9d8f" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M13.2 4.8 L12.6 3.6 L12 4.2 L11.4 3.2 L10.8 3.8 L10.2 2.8 L9.6 3.4" stroke="#2a9d8f" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.8"/>`,

        // 16. Peas vining (pole) - climbing with tendrils
        'peas-vining': `<path d="M5 9 Q4.5 10 4.5 12 Q4.5 14 6 15 L9 15 Q10 14.5 10 13 L10 11 Q10 10 9 9.5" fill="${color}"/><circle cx="6.5" cy="11.5" r="1.4" fill="#2a9d8f" opacity="0.35"/><circle cx="8" cy="12" r="1.4" fill="#2a9d8f" opacity="0.35"/><path d="M10 9 L10 3" stroke="#2a9d8f" stroke-width="1.5" fill="none"/><path d="M10 7 Q12 6 13 5.5 Q14 5 14.5 5.5" stroke="#2a9d8f" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M10 5 Q11.5 4.5 12.5 4 Q13.5 3.5 14 3.8" stroke="#2a9d8f" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M14.5 5.5 Q15 6 15.5 6.5 Q16 7 16.5 6.5" stroke="#2a9d8f" stroke-width="1" fill="none" stroke-linecap="round"/><path d="M14 3.8 Q14.5 3.2 15 2.8 Q15.5 2.4 16 2.6" stroke="#2a9d8f" stroke-width="1" fill="none" stroke-linecap="round"/><path d="M10 12 Q11.5 12.5 12.5 13 Q13.5 13.5 14 14" fill="${color}" opacity="0.8"/><circle cx="11.5" cy="13" r="1.3" fill="#2a9d8f" opacity="0.35"/>`,

        // 17. Peas bush - compact pod cluster
        'peas-bush': `<path d="M6 8 Q5 9 5 11 Q5 12.5 6.5 13 L10 13 Q11.5 12.5 11.5 11 Q11.5 9 10.5 8" fill="${color}"/><circle cx="7" cy="10.5" r="1.5" fill="#2a9d8f" opacity="0.35"/><circle cx="9" cy="10.8" r="1.5" fill="#2a9d8f" opacity="0.35"/><path d="M9 8 Q8.5 10 8.5 12.5 L8.5 15" stroke="${color}" stroke-width="1.5" fill="none"/><path d="M11 10 Q10.5 11 10.5 12.5 Q10.5 14 11.5 15 L14.5 15 Q15.5 14 15.5 12.5 Q15.5 11 14.5 10" fill="${color}"/><circle cx="12" cy="12" r="1.5" fill="#2a9d8f" opacity="0.35"/><circle cx="14" cy="12.3" r="1.5" fill="#2a9d8f" opacity="0.35"/><path d="M8.5 7 L7.5 4.5 L7 4 L7.5 3.5 L8 4" fill="#2a9d8f"/><path d="M8.5 6 L9.5 3.5 L10 3 L10.5 2.5 L11 3" fill="#2a9d8f"/>`,

        // 18. Mustard - deeply serrated spicy leaves with bold texture
        'mustard': `<path d="M10 2 L10 17" stroke="${color}" stroke-width="1.8" opacity="0.6"/><path d="M10 4 Q6 4.5 4.8 7.5 L4.3 8.5 L4.8 9 L4.2 9.7 L4.7 10.2 L4.1 11 L4.6 11.5 L4 12.3 L4.6 12.8 L5.8 12.5 L7.5 13.5 L9.5 12" fill="${color}"/><path d="M10 4 Q14 4.5 15.2 7.5 L15.7 8.5 L15.2 9 L15.8 9.7 L15.3 10.2 L15.9 11 L15.4 11.5 L16 12.3 L15.4 12.8 L14.2 12.5 L12.5 13.5 L10.5 12" fill="${color}"/><circle cx="6.5" cy="9" r="0.9" fill="${color}" opacity="0.8"/><circle cx="13.5" cy="9" r="0.9" fill="${color}" opacity="0.8"/><path d="M10 10.5 Q6.5 11 5.3 14.5 L4.8 15.5 L5.3 16 L4.7 16.7 L5.2 17.2 L6.2 16.8 L8 17.5 L9.5 16.5" fill="${color}" opacity="0.75"/><path d="M10 10.5 Q13.5 11 14.7 14.5 L15.2 15.5 L14.7 16 L15.3 16.7 L14.8 17.2 L13.8 16.8 L12 17.5 L10.5 16.5" fill="${color}" opacity="0.75"/><circle cx="7" cy="14" r="0.8" fill="${color}" opacity="0.7"/><circle cx="13" cy="14" r="0.8" fill="${color}" opacity="0.7"/>`,

        // 19. Parsley - flat-leaf with triplet leaflets, angular lobes
        'parsley': `<path d="M10 2 L10 18" stroke="${color}" stroke-width="1.6" opacity="0.5"/><path d="M10 4.5 Q8.5 5 7.5 6.5" stroke="${color}" stroke-width="1.2" fill="none"/><path d="M6 5.5 Q5 6 4.8 7 Q4.5 7.5 4.8 8 L5.5 8.5 L6.2 8.2 L6.8 8.8 L7.5 8.2 L8 7.5" fill="${color}"/><path d="M5.2 6.5 Q4.5 7 4.3 7.8 L4.8 8.2 L5.5 7.8 M6.2 6.8 Q5.8 7.5 5.8 8.2 L6.5 8.5 L7 8 M7.2 6.5 Q7.2 7.3 7.5 8 L8 8.2 L8.3 7.5" stroke="${color}" stroke-width="0.7" opacity="0.8" fill="none"/><path d="M10 4.5 Q11.5 5 12.5 6.5" stroke="${color}" stroke-width="1.2" fill="none"/><path d="M14 5.5 Q15 6 15.2 7 Q15.5 7.5 15.2 8 L14.5 8.5 L13.8 8.2 L13.2 8.8 L12.5 8.2 L12 7.5" fill="${color}"/><path d="M14.8 6.5 Q15.5 7 15.7 7.8 L15.2 8.2 L14.5 7.8 M13.8 6.8 Q14.2 7.5 14.2 8.2 L13.5 8.5 L13 8 M12.8 6.5 Q12.8 7.3 12.5 8 L12 8.2 L11.7 7.5" stroke="${color}" stroke-width="0.7" opacity="0.8" fill="none"/><path d="M10 9.5 Q8.5 10 7 11.5" stroke="${color}" stroke-width="1.2" fill="none"/><path d="M5.5 10.5 Q4.5 11 4.3 12 Q4 12.5 4.3 13 L5 13.5 L5.7 13.2 L6.3 13.8 L7 13.2 L7.5 12.5" fill="${color}" opacity="0.9"/><path d="M4.7 11 Q4 11.5 3.8 12.3 L4.3 12.7 L5 12.3 M5.7 11.3 Q5.3 12 5.3 12.7 L6 13 L6.5 12.5 M6.7 11 Q6.7 11.8 7 12.5 L7.5 12.7 L7.8 12" stroke="${color}" stroke-width="0.7" opacity="0.8" fill="none"/><path d="M10 9.5 Q11.5 10 13 11.5" stroke="${color}" stroke-width="1.2" fill="none"/><path d="M14.5 10.5 Q15.5 11 15.7 12 Q16 12.5 15.7 13 L15 13.5 L14.3 13.2 L13.7 13.8 L13 13.2 L12.5 12.5" fill="${color}" opacity="0.9"/><path d="M15.3 11 Q16 11.5 16.2 12.3 L15.7 12.7 L15 12.3 M14.3 11.3 Q14.7 12 14.7 12.7 L14 13 L13.5 12.5 M13.3 11 Q13.3 11.8 13 12.5 L12.5 12.7 L12.2 12" stroke="${color}" stroke-width="0.7" opacity="0.8" fill="none"/><path d="M10 14.5 Q8.2 15 6.5 16.5" stroke="${color}" stroke-width="1.2" fill="none"/><path d="M5 15.5 Q4 16 3.8 17 Q3.5 17.5 3.8 18 L4.5 18.5 L5.2 18.2 L5.8 18.8 L6.5 18.2 L7 17.5" fill="${color}" opacity="0.85"/><path d="M4.2 16 Q3.5 16.5 3.3 17.3 L3.8 17.7 L4.5 17.3 M5.2 16.3 Q4.8 17 4.8 17.7 L5.5 18 L6 17.5" stroke="${color}" stroke-width="0.7" opacity="0.8" fill="none"/><path d="M10 14.5 Q11.8 15 13.5 16.5" stroke="${color}" stroke-width="1.2" fill="none"/><path d="M15 15.5 Q16 16 16.2 17 Q16.5 17.5 16.2 18 L15.5 18.5 L14.8 18.2 L14.2 18.8 L13.5 18.2 L13 17.5" fill="${color}" opacity="0.85"/><path d="M15.8 16 Q16.5 16.5 16.7 17.3 L16.2 17.7 L15.5 17.3 M14.8 16.3 Q15.2 17 15.2 17.7 L14.5 18 L14 17.5" stroke="${color}" stroke-width="0.7" opacity="0.8" fill="none"/>`,

        // 20. Carrot - detailed tapering root with texture lines and bushy greens
        'carrot': `<path d="M10 17.8 L10.5 9.5 Q11.2 6.5 10.5 4.8 Q10 5.5 9.8 7 Q9.5 8.5 9.5 9.5 L10 17.8" fill="${color}"/><path d="M9.5 17.8 L10 10 Q10.3 7.5 10 5.8 Q9.7 7.5 10 10 L9.5 17.8" fill="${color}" opacity="0.92"/><path d="M9.7 8.5 L9.2 9.5 M10.3 8.5 L10.8 9.5 M9.5 11.5 L9 12.5 M10.5 11.5 L11 12.5 M9.6 14 L9.1 15 M10.4 14 L10.9 15 M9.7 16.2 L9.3 17 M10.3 16.2 L10.7 17" stroke="#1d3557" stroke-width="0.6" opacity="0.3"/><circle cx="10" cy="18.2" r="0.6" fill="${color}"/><path d="M8.5 4 Q7.5 3.5 6.8 2.3 L6.3 1.8 L6.8 2.3 L7.3 2.8" stroke="#2a9d8f" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M9.2 4.3 Q8.5 3.8 7.8 2.8 L7.3 2.2 L7.8 2.7 L8.3 3.3" stroke="#2a9d8f" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M10 4.5 Q10 3.5 10 2.2 L10 1.5 L10 2.2 L10 3.2" stroke="#2a9d8f" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M10.8 4.3 Q11.5 3.8 12.2 2.8 L12.7 2.2 L12.2 2.7 L11.7 3.3" stroke="#2a9d8f" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M11.5 4 Q12.5 3.5 13.2 2.3 L13.7 1.8 L13.2 2.3 L12.7 2.8" stroke="#2a9d8f" stroke-width="1.7" fill="none" stroke-linecap="round"/><ellipse cx="7.8" cy="2.8" rx="1.1" ry="1.6" fill="#2a9d8f" opacity="0.6"/><ellipse cx="12.2" cy="2.8" rx="1.1" ry="1.6" fill="#2a9d8f" opacity="0.6"/>`,

        // 21. Cabbage - very dense multilayered head with detailed veining
        'cabbage': `<circle cx="10" cy="11.5" r="7.5" fill="${color}" opacity="0.4"/><path d="M10 3.5 Q4.5 4.5 3.5 9.5 Q2.5 14 5.8 16.8 Q8.2 18.2 10 18.2 Q11.8 18.2 14.2 16.8 Q17.5 14 16.5 9.5 Q15.5 4.5 10 3.5" fill="${color}"/><path d="M10 5.5 Q6.5 6.5 5.5 10.5 Q4.8 13.5 7.5 15.8 Q9.2 16.8 10 16.8 Q10.8 16.8 12.5 15.8 Q15.2 13.5 14.5 10.5 Q13.5 6.5 10 5.5" fill="${color}" opacity="0.8"/><path d="M10 7.8 Q7.5 8.5 6.8 11.2 Q6.3 13.5 8.5 15 Q9.8 15.8 10 15.8 Q10.2 15.8 11.5 15 Q13.7 13.5 13.2 11.2 Q12.5 8.5 10 7.8" fill="${color}" opacity="0.6"/><path d="M10 10 Q8.2 10.5 7.5 12.2 Q7 13.8 9 14.5 Q10 14.8 11 14.5 Q13 13.8 12.5 12.2 Q11.8 10.5 10 10" fill="${color}" opacity="0.45"/><path d="M10 11.5 Q8.8 12 8.3 13 Q8 13.8 9.3 14.2 Q10 14.5 10.7 14.2 Q12 13.8 11.7 13 Q11.2 12 10 11.5" fill="${color}" opacity="0.3"/><path d="M6 10.5 Q7.5 11.5 9 12 M11 12 Q12.5 11.5 14 10.5" stroke="#1d3557" stroke-width="0.6" opacity="0.25" fill="none"/><path d="M6.8 13.5 Q8.2 14.2 9.5 14.5 M10.5 14.5 Q11.8 14.2 13.2 13.5" stroke="#1d3557" stroke-width="0.6" opacity="0.25" fill="none"/><path d="M5.5 9 Q7 10 8.5 10.5 M11.5 10.5 Q13 10 14.5 9" stroke="#1d3557" stroke-width="0.5" opacity="0.2" fill="none"/>`,

        // 22. Cauliflower - detailed bumpy floret clusters with intricate texture
        'cauliflower': `<circle cx="10" cy="10.5" r="7" fill="${color}"/><circle cx="6.5" cy="8.8" r="2.8" fill="${color}"/><circle cx="13.5" cy="8.8" r="2.8" fill="${color}"/><circle cx="10" cy="6.8" r="3" fill="${color}"/><circle cx="8" cy="11.5" r="2.5" fill="${color}"/><circle cx="12" cy="11.5" r="2.5" fill="${color}"/><circle cx="10" cy="13.2" r="2.8" fill="${color}"/><circle cx="5.2" cy="11.5" r="2" fill="${color}"/><circle cx="14.8" cy="11.5" r="2" fill="${color}"/><circle cx="7.5" cy="14.2" r="1.8" fill="${color}"/><circle cx="12.5" cy="14.2" r="1.8" fill="${color}"/><g opacity="0.18"><circle cx="7.5" cy="9.5" r="1.1" fill="#1d3557"/><circle cx="10" cy="8.8" r="1.2" fill="#1d3557"/><circle cx="12.5" cy="9.5" r="1.1" fill="#1d3557"/><circle cx="8.5" cy="11.8" r="1" fill="#1d3557"/><circle cx="11.5" cy="11.8" r="1" fill="#1d3557"/><circle cx="10" cy="13" r="1.1" fill="#1d3557"/><circle cx="6.8" cy="12.5" r="0.8" fill="#1d3557"/><circle cx="13.2" cy="12.5" r="0.8" fill="#1d3557"/></g><path d="M7.5 15 Q7 15.5 7 16.5 L7.5 17 L8 16.8" stroke="#2a9d8f" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M10 15.5 Q10 16 10 17 L10 17.5" stroke="#2a9d8f" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M12.5 15 Q13 15.5 13 16.5 L12.5 17 L12 16.8" stroke="#2a9d8f" stroke-width="1.7" fill="none" stroke-linecap="round"/><ellipse cx="8.5" cy="16.2" rx="1.2" ry="1.5" fill="#2a9d8f" opacity="0.5"/><ellipse cx="11.5" cy="16.2" rx="1.2" ry="1.5" fill="#2a9d8f" opacity="0.5"/>`,

        // 23. Yarrow - dense flat-topped umbel flower cluster with many tiny florets
        'yarrow': `<circle cx="10" cy="6.5" r="2.2" fill="${color}"/><circle cx="6" cy="9" r="1.8" fill="${color}"/><circle cx="14" cy="9" r="1.8" fill="${color}"/><circle cx="7.2" cy="11.5" r="1.5" fill="${color}"/><circle cx="12.8" cy="11.5" r="1.5" fill="${color}"/><circle cx="10" cy="13" r="1.5" fill="${color}"/><circle cx="4.8" cy="11" r="1.2" fill="${color}"/><circle cx="15.2" cy="11" r="1.2" fill="${color}"/><circle cx="8.2" cy="14" r="1.2" fill="${color}"/><circle cx="11.8" cy="14" r="1.2" fill="${color}"/><circle cx="9" cy="8.5" r="1.1" fill="${color}" opacity="0.85"/><circle cx="11" cy="8.5" r="1.1" fill="${color}" opacity="0.85"/><circle cx="8" cy="10" r="0.9" fill="${color}" opacity="0.85"/><circle cx="12" cy="10" r="0.9" fill="${color}" opacity="0.85"/><circle cx="9" cy="12.2" r="0.8" fill="${color}" opacity="0.85"/><circle cx="11" cy="12.2" r="0.8" fill="${color}" opacity="0.85"/><path d="M10 13 L10 18.5" stroke="#2a9d8f" stroke-width="2"/><path d="M10 15.5 Q7.8 16 6.5 17.2 M10 15.5 Q12.2 16 13.5 17.2" stroke="#2a9d8f" stroke-width="1.3" fill="none" opacity="0.65"/>`,

        // 24. Basil - pointed aromatic leaves
        'basil': `<path d="M10 2 L10 17" stroke="${color}" stroke-width="1.8" opacity="0.5"/><path d="M10 4 Q7 4.5 6 7 Q5.5 8 6 8.5 Q6.5 9 7.5 8.8 L9 8" fill="${color}"/><path d="M10 4 Q13 4.5 14 7 Q14.5 8 14 8.5 Q13.5 9 12.5 8.8 L11 8" fill="${color}"/><ellipse cx="7.5" cy="6.5" rx="2" ry="2.5" fill="${color}" opacity="0.8"/><ellipse cx="12.5" cy="6.5" rx="2" ry="2.5" fill="${color}" opacity="0.8"/><path d="M10 9 Q7 9.5 6 12 Q5.5 13 6 13.5 Q6.5 14 7.5 13.8 L9 13" fill="${color}" opacity="0.9"/><path d="M10 9 Q13 9.5 14 12 Q14.5 13 14 13.5 Q13.5 14 12.5 13.8 L11 13" fill="${color}" opacity="0.9"/><ellipse cx="7.5" cy="11" rx="2" ry="2.5" fill="${color}" opacity="0.7"/><ellipse cx="12.5" cy="11" rx="2" ry="2.5" fill="${color}" opacity="0.7"/><path d="M7.5 6 L7.5 7.5 M12.5 6 L12.5 7.5 M7.5 10.5 L7.5 12 M12.5 10.5 L12.5 12" stroke="#1d3557" stroke-width="0.4" opacity="0.3"/>`,

        // 25. Kohlrabi - round bulb above ground
        'kohlrabi': `<circle cx="10" cy="11" r="5.5" fill="${color}"/><circle cx="10" cy="11" r="4.5" fill="${color}" opacity="0.8"/><circle cx="8" cy="9.5" r="1.2" fill="#ffffff" opacity="0.3"/><path d="M7 7 Q6.5 6 6 5.5 L5.5 5 L6 4.5 L6.5 5" fill="#2a9d8f"/><path d="M10 6 Q10 5 10 4.5 L10 4 L10 3.5 L10 4" fill="#2a9d8f"/><path d="M13 7 Q13.5 6 14 5.5 L14.5 5 L14 4.5 L13.5 5" fill="#2a9d8f"/><ellipse cx="7" cy="5.5" rx="1.5" ry="2" fill="#2a9d8f" opacity="0.7"/><ellipse cx="10" cy="4.5" rx="1.5" ry="2" fill="#2a9d8f" opacity="0.7"/><ellipse cx="13" cy="5.5" rx="1.5" ry="2" fill="#2a9d8f" opacity="0.7"/><path d="M6.5 11 Q6.5 12 7 13 L7.5 13.5" stroke="${color}" stroke-width="1" fill="none" opacity="0.5"/><path d="M13.5 11 Q13.5 12 13 13 L12.5 13.5" stroke="${color}" stroke-width="1" fill="none" opacity="0.5"/><circle cx="10" cy="16.5" r="0.8" fill="${color}"/>`,

        // 26. Fennel - feathery fronds with bulb
        'fennel': `<ellipse cx="10" cy="14" rx="3.5" ry="3" fill="${color}" opacity="0.6"/><path d="M8 11 Q7.5 11 7.5 12 L7.5 14 Q7.5 15 8.5 15" fill="${color}" opacity="0.8"/><path d="M12 11 Q12.5 11 12.5 12 L12.5 14 Q12.5 15 11.5 15" fill="${color}" opacity="0.8"/><path d="M10 11 L10 2" stroke="${color}" stroke-width="1.5" opacity="0.5"/><path d="M10 3 Q7 3 6 5 L5.5 5.5 Q5 6 5.5 6.5 L6 7 L6.5 6.8 L7 7.5 L7.5 7.2 L8 8" stroke="${color}" stroke-width="1.2" fill="none"/><path d="M10 3 Q13 3 14 5 L14.5 5.5 Q15 6 14.5 6.5 L14 7 L13.5 6.8 L13 7.5 L12.5 7.2 L12 8" stroke="${color}" stroke-width="1.2" fill="none"/><path d="M10 6 Q7.5 6 6.5 8 L6 8.5 Q5.5 9 6 9.5 L6.5 10 L7 9.8 L7.5 10.5" stroke="${color}" stroke-width="1.2" fill="none"/><path d="M10 6 Q12.5 6 13.5 8 L14 8.5 Q14.5 9 14 9.5 L13.5 10 L13 9.8 L12.5 10.5" stroke="${color}" stroke-width="1.2" fill="none"/>`,

        // 27. Cilantro - delicate lacy fan-shaped leaves with rounded lobes
        'cilantro': `<path d="M10 2 L10 18.5" stroke="${color}" stroke-width="1.3" opacity="0.4"/><path d="M10 5 Q7 5.5 5.5 7.5" stroke="${color}" stroke-width="0.9" fill="none" opacity="0.7"/><path d="M5.5 7.5 Q4.5 7.8 4 8.5 Q3.5 9 4 9.5 Q4.5 9.8 5 9.5 Q5.3 9 5.5 8.5 Q5.8 8.8 6.2 9 Q6.8 9.2 7 8.7 Q7.2 8.2 6.8 7.8 Q6.5 7.5 6 7.5 Q6.2 7.2 6.5 7 Q7 6.8 7.2 7.3 Q7.5 7.8 7.8 8 Q8.3 8.2 8.5 7.7 Q8.5 7.2 8 7 Q7.5 6.8 7.2 7" fill="${color}" opacity="0.75"/><path d="M10 5 Q13 5.5 14.5 7.5" stroke="${color}" stroke-width="0.9" fill="none" opacity="0.7"/><path d="M14.5 7.5 Q15.5 7.8 16 8.5 Q16.5 9 16 9.5 Q15.5 9.8 15 9.5 Q14.7 9 14.5 8.5 Q14.2 8.8 13.8 9 Q13.2 9.2 13 8.7 Q12.8 8.2 13.2 7.8 Q13.5 7.5 14 7.5 Q13.8 7.2 13.5 7 Q13 6.8 12.8 7.3 Q12.5 7.8 12.2 8 Q11.7 8.2 11.5 7.7 Q11.5 7.2 12 7 Q12.5 6.8 12.8 7" fill="${color}" opacity="0.75"/><path d="M10 10 Q6.5 10.5 4.8 12.8" stroke="${color}" stroke-width="0.9" fill="none" opacity="0.7"/><path d="M4.8 12.8 Q3.8 13.2 3.2 14 Q2.7 14.5 3.2 15 Q3.7 15.3 4.3 15 Q4.6 14.5 4.8 14 Q5.2 14.3 5.6 14.5 Q6.2 14.7 6.5 14.2 Q6.7 13.7 6.2 13.3 Q5.8 13 5.3 13 Q5.5 12.7 5.8 12.5 Q6.3 12.3 6.6 12.8 Q7 13.3 7.3 13.5 Q7.8 13.7 8 13.2 Q8.2 12.7 7.7 12.5 Q7.2 12.2 6.8 12.5" fill="${color}" opacity="0.7"/><path d="M10 10 Q13.5 10.5 15.2 12.8" stroke="${color}" stroke-width="0.9" fill="none" opacity="0.7"/><path d="M15.2 12.8 Q16.2 13.2 16.8 14 Q17.3 14.5 16.8 15 Q16.3 15.3 15.7 15 Q15.4 14.5 15.2 14 Q14.8 14.3 14.4 14.5 Q13.8 14.7 13.5 14.2 Q13.3 13.7 13.8 13.3 Q14.2 13 14.7 13 Q14.5 12.7 14.2 12.5 Q13.7 12.3 13.4 12.8 Q13 13.3 12.7 13.5 Q12.2 13.7 12 13.2 Q11.8 12.7 12.3 12.5 Q12.8 12.2 13.2 12.5" fill="${color}" opacity="0.7"/><path d="M10 15.5 Q6.2 16 4.2 18.5" stroke="${color}" stroke-width="0.9" fill="none" opacity="0.65"/><path d="M4.2 18.5 Q3.5 18.8 3.2 19.2 Q3 19.5 3.5 19.8 Q4 19.9 4.5 19.5 Q4.7 19.2 4.8 18.8 Q5.1 19 5.4 19.1 Q5.9 19.2 6.1 18.8 Q6.2 18.4 5.8 18.1 Q5.5 17.9 5.1 18 Q5.3 17.7 5.5 17.6 Q5.9 17.5 6.1 17.9" fill="${color}" opacity="0.65"/><path d="M10 15.5 Q13.8 16 15.8 18.5" stroke="${color}" stroke-width="0.9" fill="none" opacity="0.65"/><path d="M15.8 18.5 Q16.5 18.8 16.8 19.2 Q17 19.5 16.5 19.8 Q16 19.9 15.5 19.5 Q15.3 19.2 15.2 18.8 Q14.9 19 14.6 19.1 Q14.1 19.2 13.9 18.8 Q13.8 18.4 14.2 18.1 Q14.5 17.9 14.9 18 Q14.7 17.7 14.5 17.6 Q14.1 17.5 13.9 17.9" fill="${color}" opacity="0.65"/>`,

        // 28. Turnip - purple-white root
        'turnip': `<circle cx="10" cy="12" r="5" fill="${color}"/><ellipse cx="10" cy="12" rx="4" ry="4.5" fill="${color}" opacity="0.9"/><ellipse cx="10" cy="10" rx="3.5" ry="2" fill="#f5f5f5"/><circle cx="8.5" cy="10" r="1" fill="#ffffff" opacity="0.4"/><path d="M10 7 L10 8.5" stroke="${color}" stroke-width="1.3" opacity="0.7"/><path d="M8 5 Q7.5 4 7.5 3 L7 2.5 L7.5 3 L8 3.5" stroke="#2a9d8f" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M9.5 4.5 Q9 3.5 9 2.5 L8.5 2 L9 2.5 L9.5 3" stroke="#2a9d8f" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M10.5 4.5 Q11 3.5 11 2.5 L11.5 2 L11 2.5 L10.5 3" stroke="#2a9d8f" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M12 5 Q12.5 4 12.5 3 L13 2.5 L12.5 3 L12 3.5" stroke="#2a9d8f" stroke-width="1.5" fill="none" stroke-linecap="round"/><ellipse cx="8.5" cy="3.5" rx="1" ry="1.5" fill="#2a9d8f" opacity="0.6"/><ellipse cx="11.5" cy="3.5" rx="1" ry="1.5" fill="#2a9d8f" opacity="0.6"/><circle cx="10" cy="17" r="0.7" fill="${color}"/>`,

        // 28b. Rutabaga - large bulbous yellowish root with purple crown
        'rutabaga': `<ellipse cx="10" cy="12.5" rx="4.8" ry="5.5" fill="${color}"/><ellipse cx="10" cy="12.5" rx="4" ry="4.8" fill="${color}" opacity="0.9"/><ellipse cx="10" cy="9.5" rx="4.2" ry="2.5" fill="#9d84b7"/><ellipse cx="10" cy="9" rx="3.8" ry="2" fill="#8b7ba8" opacity="0.8"/><path d="M10 7 L10 9" stroke="${color}" stroke-width="1.5" opacity="0.7"/><circle cx="8" cy="11" r="1.3" fill="#ffffff" opacity="0.25"/><circle cx="11.5" cy="13" r="1" fill="#1d3557" opacity="0.15"/><path d="M7.5 5.5 Q7 4.5 6.8 3.5 L6.5 3 L6.8 3.5 L7.2 4" stroke="#2a9d8f" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M9 5 Q8.5 4 8.5 3 L8 2.5 L8.5 3 L9 3.5" stroke="#2a9d8f" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M10.5 5 Q10.5 4 10.5 3 L10 2.5 L10.5 3 L11 3.5" stroke="#2a9d8f" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M12 5.5 Q12.5 4.5 12.8 3.5 L13 3 L12.8 3.5 L12.5 4" stroke="#2a9d8f" stroke-width="1.5" fill="none" stroke-linecap="round"/><ellipse cx="8.2" cy="4" rx="0.9" ry="1.3" fill="#2a9d8f" opacity="0.6"/><ellipse cx="11.8" cy="4" rx="0.9" ry="1.3" fill="#2a9d8f" opacity="0.6"/><path d="M10 17.5 Q10 16.8 10.5 16.5" stroke="${color}" stroke-width="1" opacity="0.8" fill="none"/><circle cx="10" cy="17.8" r="0.6" fill="${color}" opacity="0.9"/>`,

        // 29. Sage - large velvety textured oblong leaves with deep wrinkles and fuzzy appearance
        'sage': `<path d="M10 3 L10 18" stroke="${color}" stroke-width="2.5" opacity="0.5"/><ellipse cx="6.2" cy="7.8" rx="3.3" ry="4.5" fill="${color}" transform="rotate(-12 6.2 7.8)"/><ellipse cx="13.8" cy="7.8" rx="3.3" ry="4.5" fill="${color}" transform="rotate(12 13.8 7.8)"/><path d="M5 7.8 Q5.5 8.8 6 9.5 Q6.3 10 6.8 10.2 M6.5 6.5 Q6.8 7.5 7 8.3 Q7.2 9 7.5 9.5 M13 6.5 Q13.2 7.5 13.5 8.3 Q13.8 9 14 9.5 M15 7.8 Q14.5 8.8 14 9.5 Q13.7 10 13.2 10.2" stroke="#1d3557" stroke-width="0.7" opacity="0.35" fill="none"/><ellipse cx="6.2" cy="13" rx="3.3" ry="4.5" fill="${color}" transform="rotate(-15 6.2 13)" opacity="0.95"/><ellipse cx="13.8" cy="13" rx="3.3" ry="4.5" fill="${color}" transform="rotate(15 13.8 13)" opacity="0.95"/><path d="M5 13 Q5.5 14 6 14.7 Q6.3 15.2 6.8 15.4 M6.5 11.8 Q6.8 12.8 7 13.6 Q7.2 14.2 7.5 14.8 M13 11.8 Q13.2 12.8 13.5 13.6 Q13.8 14.2 14 14.8 M15 13 Q14.5 14 14 14.7 Q13.7 15.2 13.2 15.4" stroke="#1d3557" stroke-width="0.7" opacity="0.3" fill="none"/><ellipse cx="7.2" cy="7.2" rx="1.3" ry="1.5" fill="#ffffff" opacity="0.25" transform="rotate(-12 7.2 7.2)"/><ellipse cx="12.8" cy="7.2" rx="1.3" ry="1.5" fill="#ffffff" opacity="0.25" transform="rotate(12 12.8 7.2)"/><ellipse cx="7" cy="12.5" rx="1.2" ry="1.4" fill="#ffffff" opacity="0.2" transform="rotate(-15 7 12.5)"/><ellipse cx="13" cy="12.5" rx="1.2" ry="1.4" fill="#ffffff" opacity="0.2" transform="rotate(15 13 12.5)"/>`,

        // 30. Dill - fine feathery foliage
        'dill': `<path d="M10 2 L10 17" stroke="${color}" stroke-width="1.5" opacity="0.5"/><path d="M10 4 Q8 4 7 5 Q6.5 5.5 6 6 L5.5 6.5 L5 7" stroke="${color}" stroke-width="0.8" fill="none"/><path d="M10 4 Q12 4 13 5 Q13.5 5.5 14 6 L14.5 6.5 L15 7" stroke="${color}" stroke-width="0.8" fill="none"/><path d="M10 4.5 Q8.5 4.5 7.5 5.5 Q7 6 6.5 6.5 L6 7 L5.5 7.5" stroke="${color}" stroke-width="0.8" fill="none"/><path d="M10 4.5 Q11.5 4.5 12.5 5.5 Q13 6 13.5 6.5 L14 7 L14.5 7.5" stroke="${color}" stroke-width="0.8" fill="none"/><path d="M10 7 Q8 7 7 8 Q6.5 8.5 6 9 L5.5 9.5 L5 10" stroke="${color}" stroke-width="0.8" fill="none"/><path d="M10 7 Q12 7 13 8 Q13.5 8.5 14 9 L14.5 9.5 L15 10" stroke="${color}" stroke-width="0.8" fill="none"/><path d="M10 7.5 Q8.5 7.5 7.5 8.5 Q7 9 6.5 9.5 L6 10 L5.5 10.5" stroke="${color}" stroke-width="0.8" fill="none"/><path d="M10 7.5 Q11.5 7.5 12.5 8.5 Q13 9 13.5 9.5 L14 10 L14.5 10.5" stroke="${color}" stroke-width="0.8" fill="none"/><path d="M10 10 Q8 10 7 11 Q6.5 11.5 6 12 L5.5 12.5" stroke="${color}" stroke-width="0.8" fill="none"/><path d="M10 10 Q12 10 13 11 Q13.5 11.5 14 12 L14.5 12.5" stroke="${color}" stroke-width="0.8" fill="none"/><path d="M10 10.5 Q8.5 10.5 7.5 11.5 Q7 12 6.5 12.5" stroke="${color}" stroke-width="0.8" fill="none"/><path d="M10 10.5 Q11.5 10.5 12.5 11.5 Q13 12 13.5 12.5" stroke="${color}" stroke-width="0.8" fill="none"/>`,

        // 31. Parsnip - long cream taproot with broad shoulders tapering down
        'parsnip': `<path d="M10 17.8 L10.5 10 Q11.3 7 10.5 5.2 Q10 5.8 9.8 6.5 Q9.5 7.5 9.5 10 L10 17.8" fill="${color}" stroke="#d0d0d0" stroke-width="0.4"/><path d="M9.5 17.8 L10 10.3 Q10.3 7.8 10 6 Q9.7 7.8 10 10.3 L9.5 17.8" fill="${color}" opacity="0.96"/><ellipse cx="10" cy="5.8" rx="2.2" ry="1.4" fill="${color}" stroke="#d0d0d0" stroke-width="0.4"/><path d="M9.6 7.8 L9.1 8.8 M10.4 7.8 L10.9 8.8 M9.4 10.2 L8.9 11.2 M10.6 10.2 L11.1 11.2 M9.5 12.8 L9 13.8 M10.5 12.8 L11 13.8 M9.6 15.2 L9.2 16 M10.4 15.2 L10.8 16" stroke="#1d3557" stroke-width="0.6" opacity="0.3"/><circle cx="10" cy="18" r="0.8" fill="${color}" stroke="#d0d0d0" stroke-width="0.35"/><path d="M8 4.2 Q7.5 3.5 6.8 2.2 L6.3 1.6 L6.8 2.2 L7.3 2.9" stroke="#2a9d8f" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M9.2 4.6 Q8.7 3.9 8 2.7 L7.5 2.1 L8 2.7 L8.5 3.4" stroke="#2a9d8f" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M10 4.8 Q10 4 10 2.2 L10 1.6 L10 2.2 L10 3.4" stroke="#2a9d8f" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M10.8 4.6 Q11.3 3.9 12 2.7 L12.5 2.1 L12 2.7 L11.5 3.4" stroke="#2a9d8f" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M12 4.2 Q12.5 3.5 13.2 2.2 L13.7 1.6 L13.2 2.2 L12.7 2.9" stroke="#2a9d8f" stroke-width="1.7" fill="none" stroke-linecap="round"/>`,

        // 32. Marigolds - layered ruffled petals
        'marigold': `<circle cx="10" cy="9" r="5.5" fill="${color}"/><path d="M10 9 L10 3.5 M10 9 L14.9 5.6 M10 9 L16.4 9 M10 9 L14.9 12.4 M10 9 L10 14.5 M10 9 L5.1 12.4 M10 9 L3.6 9 M10 9 L5.1 5.6" stroke="${color}" stroke-width="1.8" opacity="0.8"/><circle cx="10" cy="9" r="4" fill="${color}" opacity="0.7"/><g opacity="0.9"><circle cx="10" cy="5" r="1.3" fill="${color}"/><circle cx="13.5" cy="6.5" r="1.3" fill="${color}"/><circle cx="15" cy="9" r="1.3" fill="${color}"/><circle cx="13.5" cy="11.5" r="1.3" fill="${color}"/><circle cx="10" cy="13" r="1.3" fill="${color}"/><circle cx="6.5" cy="11.5" r="1.3" fill="${color}"/><circle cx="5" cy="9" r="1.3" fill="${color}"/><circle cx="6.5" cy="6.5" r="1.3" fill="${color}"/></g><circle cx="10" cy="9" r="2" fill="#d97638" opacity="0.6"/><path d="M10 13 L10 17" stroke="#2a9d8f" stroke-width="1.8"/>`,

        // 33. Echinacea - cone flower with drooping petals
        'echinacea': `<circle cx="10" cy="8.5" r="2.5" fill="#d97638" opacity="0.8"/><circle cx="10" cy="8.5" r="1.8" fill="#c1604a"/><g opacity="0.15"><circle cx="9" cy="7.5" r="0.4" fill="#1d3557"/><circle cx="10.5" cy="8" r="0.4" fill="#1d3557"/><circle cx="9.5" cy="9" r="0.4" fill="#1d3557"/></g><path d="M10 6 Q9.5 4 9 3.5 L8.5 3" stroke="${color}" stroke-width="1.3" fill="none"/><path d="M12 7 Q13 6 14 6 L14.5 6.2" stroke="${color}" stroke-width="1.3" fill="none"/><path d="M12 10 Q13.5 11 14.5 11.5 L15 11.8" stroke="${color}" stroke-width="1.3" fill="none"/><path d="M10 11 Q10 12.5 10 13.5 L10 14" stroke="${color}" stroke-width="1.3" fill="none"/><path d="M8 10 Q6.5 11 5.5 11.5 L5 11.8" stroke="${color}" stroke-width="1.3" fill="none"/><path d="M8 7 Q7 6 6 6 L5.5 6.2" stroke="${color}" stroke-width="1.3" fill="none"/><path d="M11 6.5 Q11.5 5 12 4 L12.5 3.5" stroke="${color}" stroke-width="1.3" fill="none"/><path d="M9 10.5 Q8 12 7.5 13 L7 13.5" stroke="${color}" stroke-width="1.3" fill="none"/><path d="M11 10.5 Q12 12 12.5 13 L13 13.5" stroke="${color}" stroke-width="1.3" fill="none"/><path d="M10 14 L10 17.5" stroke="#2a9d8f" stroke-width="1.8"/>`,

        // 34. Chamomile - detailed daisy with prominent golden center and delicate petals
        'chamomile': `<circle cx="10" cy="8" r="2.2" fill="#ffc300"/><circle cx="10" cy="8" r="1.6" fill="#d97638" opacity="0.5"/><circle cx="10" cy="8" r="1" fill="#d97638" opacity="0.3"/><ellipse cx="10" cy="4" rx="1.2" ry="2.3" fill="#f5f5f5" stroke="#d0d0d0" stroke-width="0.4" transform="rotate(0 10 8)"/><ellipse cx="13.8" cy="5.8" rx="1.2" ry="2.3" fill="#f5f5f5" stroke="#d0d0d0" stroke-width="0.4" transform="rotate(40 10 8)"/><ellipse cx="15" cy="9.8" rx="1.2" ry="2.3" fill="#f5f5f5" stroke="#d0d0d0" stroke-width="0.4" transform="rotate(80 10 8)"/><ellipse cx="13" cy="13" rx="1.2" ry="2.3" fill="#f5f5f5" stroke="#d0d0d0" stroke-width="0.4" transform="rotate(120 10 8)"/><ellipse cx="10" cy="12" rx="1.2" ry="2.3" fill="#f5f5f5" stroke="#d0d0d0" stroke-width="0.4" transform="rotate(180 10 8)"/><ellipse cx="7" cy="13" rx="1.2" ry="2.3" fill="#f5f5f5" stroke="#d0d0d0" stroke-width="0.4" transform="rotate(240 10 8)"/><ellipse cx="5" cy="9.8" rx="1.2" ry="2.3" fill="#f5f5f5" stroke="#d0d0d0" stroke-width="0.4" transform="rotate(280 10 8)"/><ellipse cx="6.2" cy="5.8" rx="1.2" ry="2.3" fill="#f5f5f5" stroke="#d0d0d0" stroke-width="0.4" transform="rotate(320 10 8)"/><path d="M10 11.5 L10 18" stroke="#2a9d8f" stroke-width="1.5"/><path d="M10 13.5 Q8.2 14 7 15.2 M10 13.5 Q11.8 14 13 15.2" stroke="#2a9d8f" stroke-width="1.2" fill="none" opacity="0.65"/>`,

        // 35. Moonflower - large trumpet-shaped white flower that opens at night
        'moonflower': `<circle cx="10" cy="9.5" r="6.5" fill="${color}" stroke="#d0d0d0" stroke-width="0.4"/><path d="M10 3 L10 9.5 M10 9.5 L4.2 5.5 M10 9.5 L4.2 13.5 M10 9.5 L15.8 5.5 M10 9.5 L15.8 13.5 M10 9.5 L10 16" stroke="${color}" stroke-width="2.2" opacity="0.6"/><circle cx="10" cy="9.5" r="5.5" fill="${color}" opacity="0.8"/><g opacity="0.9"><ellipse cx="10" cy="5.2" rx="2.8" ry="2.3" fill="${color}" stroke="#d0d0d0" stroke-width="0.35"/><ellipse cx="13.8" cy="6.8" rx="2.3" ry="2.8" fill="${color}" stroke="#d0d0d0" stroke-width="0.35" transform="rotate(30 13.8 6.8)"/><ellipse cx="15" cy="10.8" rx="2.3" ry="2.8" fill="${color}" stroke="#d0d0d0" stroke-width="0.35" transform="rotate(60 15 10.8)"/><ellipse cx="13" cy="14.2" rx="2.8" ry="2.3" fill="${color}" stroke="#d0d0d0" stroke-width="0.35" transform="rotate(90 13 14.2)"/><ellipse cx="7" cy="14.2" rx="2.8" ry="2.3" fill="${color}" stroke="#d0d0d0" stroke-width="0.35" transform="rotate(90 7 14.2)"/><ellipse cx="5" cy="10.8" rx="2.3" ry="2.8" fill="${color}" stroke="#d0d0d0" stroke-width="0.35" transform="rotate(-60 5 10.8)"/><ellipse cx="6.2" cy="6.8" rx="2.3" ry="2.8" fill="${color}" stroke="#d0d0d0" stroke-width="0.35" transform="rotate(-30 6.2 6.8)"/></g><circle cx="10" cy="9.5" r="2.3" fill="#ffc300" opacity="0.7"/><circle cx="10" cy="9.5" r="1.5" fill="#ffc300" opacity="0.5"/><circle cx="8.8" cy="8.8" r="0.9" fill="#ffffff" opacity="0.45"/><path d="M10 15 L10 18.2" stroke="#2a9d8f" stroke-width="2"/>`,

        // 36. Borage - star-shaped blue flowers
        'borage': `<path d="M10 8 L11.5 4.5 L12.5 8 L16 9 L12.5 10 L11.5 13.5 L10 10 L6.5 10 L10 8 L6.5 8 Z" fill="${color}"/><path d="M10 8 L11.2 5 L12 8 L15 9 L12 10 L11.2 13 L10 10 L7 10 L10 8 L7 8 Z" fill="${color}" opacity="0.8"/><circle cx="10" cy="9" r="1.5" fill="#ffc300" opacity="0.6"/><circle cx="10" cy="9" r="0.8" fill="#1d3557"/><path d="M10 13 L10 17" stroke="#2a9d8f" stroke-width="1.8"/><path d="M10 13.5 Q8 14 7 15.5 M10 13.5 Q12 14 13 15.5" stroke="#2a9d8f" stroke-width="1.2" fill="none" opacity="0.6"/><ellipse cx="8" cy="15.5" rx="1.2" ry="1.8" fill="#2a9d8f" opacity="0.5"/><ellipse cx="12" cy="15.5" rx="1.2" ry="1.8" fill="#2a9d8f" opacity="0.5"/>`,

        // 37. Okra - ridged elongated pod
        'okra': `<path d="M10 5 Q8.5 6 8.5 8 L8.5 15 Q8.5 16.5 10 17 Q11.5 16.5 11.5 15 L11.5 8 Q11.5 6 10 5" fill="${color}"/><path d="M9 8 L9 15 M10 7.5 L10 15.5 M11 8 L11 15" stroke="#2a9d8f" stroke-width="0.6" opacity="0.3"/><path d="M8.5 8 Q10 9 11.5 8 M8.5 11 Q10 12 11.5 11 M8.5 14 Q10 15 11.5 14" stroke="#1d3557" stroke-width="0.5" opacity="0.2"/><circle cx="10" cy="17.2" r="0.5" fill="${color}"/><path d="M9 4 Q9 3 10 2.5 Q11 3 11 4 L11 5.5 L10.5 5 L9.5 5 Z" fill="#2a9d8f"/><path d="M8.5 5 L8 5.5 M11.5 5 L12 5.5" stroke="#2a9d8f" stroke-width="1.2"/>`,

        // 38. Lima bean - flat broad bean pod
        'limabean': `<path d="M5 8 Q4.5 9 5 11 L6 14 Q6.5 15 8 15 L12 15 Q13.5 15 14 14 L15 11 Q15.5 9 15 8 Q14.5 7 13 7 L7 7 Q5.5 7 5 8" fill="${color}"/><ellipse cx="7.5" cy="10.5" rx="1.8" ry="2.2" fill="#1d3557" opacity="0.15"/><ellipse cx="10" cy="11" rx="2" ry="2.5" fill="#1d3557" opacity="0.15"/><ellipse cx="12.5" cy="10.5" rx="1.8" ry="2.2" fill="#1d3557" opacity="0.15"/><path d="M6 9 Q10 10 14 9" stroke="#1d3557" stroke-width="0.6" opacity="0.2"/><path d="M6 12.5 Q10 13.5 14 12.5" stroke="#1d3557" stroke-width="0.6" opacity="0.2"/><path d="M13 6 Q13.5 5 14 4.5 L14.5 4" stroke="#2a9d8f" stroke-width="1.2" fill="none"/>`,

        // 39. Field peas - detailed climbing vine with multiple small pods and tendrils
        'fieldpeas': `<path d="M10 16.5 Q8.5 15.8 7.8 14.2 Q8.2 12.5 10 12 Q11.8 12.5 12.2 14.2 Q11.5 15.8 10 16.5" fill="${color}"/><path d="M10 12.5 Q8.8 13 8.2 14.3 Q8.6 15.5 10 16" stroke="${color}" stroke-width="1.1" fill="none" opacity="0.75"/><circle cx="9.2" cy="14.2" r="0.85" fill="#8b9d77" opacity="0.3"/><circle cx="10.5" cy="13.8" r="0.85" fill="#8b9d77" opacity="0.3"/><path d="M10 11.5 Q8.8 10.8 7.8 9 Q8.2 7.2 10 6.8 Q11.8 7.2 12.2 9 Q11.2 10.8 10 11.5" fill="${color}" opacity="0.88"/><circle cx="9.2" cy="9" r="0.75" fill="#8b9d77" opacity="0.3"/><circle cx="10.5" cy="8.6" r="0.75" fill="#8b9d77" opacity="0.3"/><path d="M10 6.5 Q10 5.2 9.2 4 Q8.3 4.5 7.8 5.5 Q8.2 6.5 9.2 7" stroke="${color}" stroke-width="1.4" fill="none"/><path d="M10 6.5 Q10.5 5.2 11.5 4 Q12.5 4.5 13 5.8 Q12.5 6.8 11.5 7.3" stroke="${color}" stroke-width="1.4" fill="none"/><circle cx="8.5" cy="4.8" r="1.1" fill="${color}" opacity="0.65"/><circle cx="11.5" cy="4.8" r="1.1" fill="${color}" opacity="0.65"/><path d="M10 3.5 Q9 2.8 8 3.2 Q7.5 3.5 7.8 4.2" stroke="${color}" stroke-width="0.9" fill="none" opacity="0.7"/><path d="M10 3.5 Q11 2.8 12 3.2 Q12.5 3.5 12.2 4.2" stroke="${color}" stroke-width="0.9" fill="none" opacity="0.7"/>`,

        // Tomatoes - detailed with highlights and stem
        'tomato': `<circle cx="10" cy="11" r="6.5" fill="${color}"/><circle cx="10" cy="11" r="6.5" fill="url(#tomatoGrad)"/><defs><radialGradient id="tomatoGrad"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.3"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><circle cx="7.5" cy="8" r="1.5" fill="#ffffff" opacity="0.4"/><path d="M9 4 Q9 3 10 3 Q11 3 11 4 L11 6" stroke="#2a9d8f" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M8 5 L8 6 M12 5 L12 6" stroke="#2a9d8f" stroke-width="1.5"/>`,

        // Pepper - detailed bell pepper with prominent lobes, ribs, and calyx
        'pepper': `<path d="M10 5 Q6.5 6 6 9.5 L6 13 Q6 15.5 8.2 16.8 Q10 17.5 11.8 16.8 Q14 15.5 14 13 L14 9.5 Q13.5 6 10 5" fill="${color}"/><path d="M7.5 9.5 Q7 10.5 7 12.5 Q7 14.5 8.8 15.8 Q10 16.5 11.2 15.8 Q13 14.5 13 12.5 Q13 10.5 12.5 9.5" fill="${color}" opacity="0.85"/><path d="M10 6.5 L10 16.5" stroke="${color}" stroke-width="0.9" opacity="0.3"/><path d="M7.5 10 L10 13 L12.5 10" stroke="${color}" stroke-width="0.7" opacity="0.25"/><path d="M7 9 Q8.5 11 10 13 M13 9 Q11.5 11 10 13" stroke="${color}" stroke-width="0.6" opacity="0.2"/><ellipse cx="8.2" cy="10.5" rx="1.3" ry="2.2" fill="#ffffff" opacity="0.25"/><ellipse cx="11.8" cy="10.5" rx="1.1" ry="1.8" fill="#ffffff" opacity="0.15"/><path d="M8.2 5 Q8 3.8 9 3.2 L9.5 3 L9 5.2" fill="#2a9d8f"/><path d="M10 4.8 Q10 3 10 2.5 L10.5 2.5 L10 5" fill="#2a9d8f"/><path d="M11.8 5 Q12 3.8 11 3.2 L10.5 3 L11 5.2" fill="#2a9d8f"/><path d="M8.5 4.2 Q9 3.7 9.5 3.5 M11.5 4.2 Q11 3.7 10.5 3.5" stroke="#2a9d8f" stroke-width="0.9" opacity="0.6" fill="none"/><path d="M7 5.2 L7.5 5.8 M13 5.2 L12.5 5.8" stroke="#2a9d8f" stroke-width="0.8" opacity="0.5" fill="none"/>`,

        // Eggplant - rounded with calyx
        'eggplant': `<ellipse cx="10" cy="12" rx="5" ry="6.5" fill="${color}"/><ellipse cx="8" cy="11" rx="1.2" ry="2" fill="#ffffff" opacity="0.2"/><path d="M8 5 Q8 4 10 4 Q12 4 12 5 L11 7 L9 7 Z" fill="#2a9d8f"/><path d="M10 7 L10 9" stroke="#8b9d77" stroke-width="1.5"/>`,

        // Cucumber - detailed with prominent bumps, ridges, and textured skin
        'cucumber': `<rect x="4.5" y="6.5" width="11" height="7.5" rx="3.75" fill="${color}"/><rect x="5" y="7" width="10" height="6.5" rx="3.25" fill="${color}" opacity="0.85"/><line x1="6" y1="8.2" x2="14" y2="8.2" stroke="${color}" stroke-width="1.3" opacity="0.5"/><line x1="6" y1="10.5" x2="14" y2="10.5" stroke="${color}" stroke-width="1.3" opacity="0.5"/><line x1="6" y1="12.8" x2="14" y2="12.8" stroke="${color}" stroke-width="1.3" opacity="0.5"/><circle cx="7" cy="9.3" r="1.1" fill="#1d3557" opacity="0.2"/><circle cx="9.5" cy="8.8" r="1" fill="#1d3557" opacity="0.2"/><circle cx="12.2" cy="9.3" r="1.1" fill="#1d3557" opacity="0.2"/><circle cx="8" cy="11.5" r="1" fill="#1d3557" opacity="0.2"/><circle cx="11" cy="11.8" r="1.1" fill="#1d3557" opacity="0.2"/><circle cx="13.5" cy="12" r="1" fill="#1d3557" opacity="0.2"/><circle cx="6.5" cy="11.8" r="0.9" fill="#1d3557" opacity="0.18"/><circle cx="10" cy="13" r="0.9" fill="#1d3557" opacity="0.18"/><path d="M15.5 6.8 Q16 7.8 16.3 9 L16.5 10.2" stroke="#2a9d8f" stroke-width="1.5" fill="none" opacity="0.7"/><circle cx="16.8" cy="10.5" r="0.9" fill="#2a9d8f" opacity="0.6"/>`,

        // Squash (summer) - detailed elongated yellow squash with ridges and bulbous end
        'squash': `<path d="M8.2 6.5 Q7 7.5 6.7 9.2 L6.5 13 Q6.5 15 8.7 16.2 Q10 16.8 11.3 16.2 Q13.5 15 13.5 13 L13.3 9.2 Q13 7.5 11.8 6.5" fill="${color}"/><path d="M8.5 7.5 Q7.5 8.3 7.3 9.8 L7.1 12.5 Q7 14.2 8.8 15.2 Q10 15.8 11.2 15.2 Q13 14.2 12.9 12.5 L12.7 9.8 Q12.5 8.3 11.5 7.5" fill="${color}" opacity="0.85"/><path d="M10 8 L10 15.5" stroke="#8b9d77" stroke-width="0.8" opacity="0.35"/><path d="M8.2 10 Q10 10.6 11.8 10 M8 12.5 Q10 13.2 12 12.5 M8.3 14.5 Q10 15 11.7 14.5" stroke="#8b9d77" stroke-width="0.7" opacity="0.3"/><path d="M8.2 6.5 L11.8 6.5 Q11.5 5.5 11.2 4.3 L10.6 3.5 L9.4 3.5 L8.8 4.3 Q8.5 5.5 8.2 6.5" fill="#2a9d8f"/><path d="M9.8 3.2 Q9.3 2.7 8.7 3.2 M10.2 3.2 Q10.7 2.7 11.3 3.2" stroke="#2a9d8f" stroke-width="0.9" opacity="0.6"/>`,

        // Pumpkin - detailed ribbed pumpkin with prominent vertical ribs and curly stem
        'pumpkin': `<circle cx="10" cy="11.5" r="7" fill="${color}"/><path d="M10 4.5 L10 11.5 M6.5 6.5 L10 11.5 M13.5 6.5 L10 11.5 M4.8 11.5 L15.2 11.5 M7.5 8.8 Q10 14 12.5 8.8 M6 10 Q10 15 14 10" stroke="#c1604a" stroke-width="1.1" opacity="0.4"/><ellipse cx="10" cy="11.5" rx="6" ry="6.5" fill="none" stroke="${color}" stroke-width="0.5" opacity="0.25"/><path d="M8.8 2.8 Q8.8 1.8 10 1.8 Q11.2 1.8 11.2 2.8 L10.8 4.8 L9.2 4.8 Z" fill="#2a9d8f"/><path d="M10 4.8 Q7.8 4.8 7 6.2" stroke="#8b9d77" stroke-width="1.4" fill="none"/><path d="M10 4.8 Q12.2 4.8 13 6.2" stroke="#8b9d77" stroke-width="1.3" fill="none" opacity="0.8"/><circle cx="10" cy="11.5" r="0.6" fill="${color}" opacity="0.3"/>`,

        // Leafy greens - detailed leaves with veins
        'leafy': `<path d="M10 3 Q7.5 5 6 8 Q5 11 7.5 14 Q9 13 10 11" fill="${color}"/><path d="M10 3 Q12.5 5 14 8 Q15 11 12.5 14 Q11 13 10 11" fill="${color}"/><path d="M10 3 L10 14" stroke="#1d3557" stroke-width="1" opacity="0.4"/><path d="M10 6 Q8 7 7 9 M10 9 Q8 10 7 12" stroke="#1d3557" stroke-width="0.6" opacity="0.3"/><path d="M10 6 Q12 7 13 9 M10 9 Q12 10 13 12" stroke="#1d3557" stroke-width="0.6" opacity="0.3"/>`,

        // Broccoli - floret cluster
        'broccoli': `<circle cx="10" cy="7" r="4.5" fill="${color}"/><circle cx="6.5" cy="9" r="3" fill="${color}"/><circle cx="13.5" cy="9" r="3" fill="${color}"/><circle cx="10" cy="11" r="2.5" fill="${color}"/><rect x="9" y="11" width="2" height="6" rx="0.5" fill="#8b9d77"/><path d="M8.5 7 A1 1 0 0 1 9.5 7 M10.5 7 A1 1 0 0 1 11.5 7 M7 9 A1 1 0 0 1 8 9" stroke="#1d3557" stroke-width="0.5" opacity="0.3"/>`,

        // Root vegetable - tapered carrot with lines
        'root': `<path d="M10 16 L11 7 Q11 5 10 5 Q9 5 9 7 L10 16" fill="${color}"/><path d="M9.5 7 L9 8 M10.5 7 L11 8 M9.2 10 L8.8 11 M10.8 10 L11.2 11 M9 13 L8.5 14" stroke="#1d3557" stroke-width="0.6" opacity="0.3"/><path d="M9 4 L8 2.5 M10 4 L10 2 M11 4 L12 2.5" stroke="#2a9d8f" stroke-width="1.3" stroke-linecap="round"/>`,

        // Onion - layered bulb
        'onion': `<circle cx="10" cy="11" r="5.5" fill="${color}"/><ellipse cx="10" cy="11" rx="4" ry="5" fill="none" stroke="#1d3557" stroke-width="0.8" opacity="0.2"/><ellipse cx="10" cy="11" rx="2.5" ry="3.5" fill="none" stroke="#1d3557" stroke-width="0.8" opacity="0.2"/><path d="M10 4 L10 7" stroke="#2a9d8f" stroke-width="2"/><path d="M8.5 4.5 L8 3 M11.5 4.5 L12 3" stroke="#8b9d77" stroke-width="1.2"/>`,

        // Garlic - segmented bulb with individual cloves visible
        'garlic': `<circle cx="10" cy="11.5" r="5.2" fill="${color}"/><path d="M7 11.5 L13 11.5 M10 8.3 L10 14.7" stroke="#1d3557" stroke-width="0.9" opacity="0.3"/><path d="M8 9.8 Q10 9.2 12 9.8 M8 13.2 Q10 13.8 12 13.2" stroke="#1d3557" stroke-width="0.9" opacity="0.3"/><ellipse cx="7.5" cy="11.5" rx="2.3" ry="3.8" fill="none" stroke="#1d3557" stroke-width="0.7" opacity="0.25"/><ellipse cx="12.5" cy="11.5" rx="2.3" ry="3.8" fill="none" stroke="#1d3557" stroke-width="0.7" opacity="0.25"/><ellipse cx="10" cy="10" rx="2" ry="2.5" fill="none" stroke="#1d3557" stroke-width="0.7" opacity="0.25"/><ellipse cx="10" cy="13" rx="2" ry="2.5" fill="none" stroke="#1d3557" stroke-width="0.7" opacity="0.25"/><path d="M8.5 5.5 L9 6.5 L9.5 6.8 L10 6.8 L10.5 6.8 L11 6.5 L11.5 5.5 Q11 4.5 10 4.2 Q9 4.5 8.5 5.5" fill="#e5e5e5"/><path d="M10 6.8 L10 8.3" stroke="#cccccc" stroke-width="1.3"/>`,

        // Peas/beans - detailed pod with peas
        'legume': `<path d="M6 7 Q5 9 5 12 Q5 13.5 6.5 14 L13.5 14 Q15 13.5 15 12 Q15 9 14 7 Q14 6 12.5 6 L7.5 6 Q6 6 6 7" fill="${color}"/><circle cx="8" cy="10" r="1.6" fill="#1d3557" opacity="0.2"/><circle cx="10" cy="10.5" r="1.6" fill="#1d3557" opacity="0.2"/><circle cx="12" cy="10" r="1.6" fill="#1d3557" opacity="0.2"/><path d="M7 8 Q10 9 13 8" stroke="#1d3557" stroke-width="0.6" opacity="0.2"/>`,

        // Corn - detailed ear with prominent kernel rows and flowing silk strands
        'corn': `<rect x="6.5" y="5" width="7" height="11.5" rx="2" fill="${color}"/><g opacity="0.55"><circle cx="7.8" cy="6.5" r="0.7" fill="#d97638"/><circle cx="9.4" cy="6.5" r="0.7" fill="#d97638"/><circle cx="11" cy="6.5" r="0.7" fill="#d97638"/><circle cx="12.6" cy="6.5" r="0.7" fill="#d97638"/><circle cx="7.8" cy="8.2" r="0.7" fill="#d97638"/><circle cx="9.4" cy="8.2" r="0.7" fill="#d97638"/><circle cx="11" cy="8.2" r="0.7" fill="#d97638"/><circle cx="12.6" cy="8.2" r="0.7" fill="#d97638"/><circle cx="7.8" cy="9.9" r="0.7" fill="#d97638"/><circle cx="9.4" cy="9.9" r="0.7" fill="#d97638"/><circle cx="11" cy="9.9" r="0.7" fill="#d97638"/><circle cx="12.6" cy="9.9" r="0.7" fill="#d97638"/><circle cx="7.8" cy="11.6" r="0.7" fill="#d97638"/><circle cx="9.4" cy="11.6" r="0.7" fill="#d97638"/><circle cx="11" cy="11.6" r="0.7" fill="#d97638"/><circle cx="12.6" cy="11.6" r="0.7" fill="#d97638"/><circle cx="7.8" cy="13.3" r="0.7" fill="#d97638"/><circle cx="9.4" cy="13.3" r="0.7" fill="#d97638"/><circle cx="11" cy="13.3" r="0.7" fill="#d97638"/><circle cx="12.6" cy="13.3" r="0.7" fill="#d97638"/><circle cx="7.8" cy="15" r="0.7" fill="#d97638"/><circle cx="9.4" cy="15" r="0.7" fill="#d97638"/><circle cx="11" cy="15" r="0.7" fill="#d97638"/><circle cx="12.6" cy="15" r="0.7" fill="#d97638"/></g><path d="M6 3.8 Q5.5 4.3 5.5 5.2 L5.5 6" stroke="#d4a574" stroke-width="0.7" opacity="0.65"/><path d="M6.8 3.3 Q6.3 3.8 6.3 4.7 L6.3 5.5" stroke="#d4a574" stroke-width="0.7" opacity="0.65"/><path d="M7.5 3 Q7 3.5 7 4.4 L7 5.2" stroke="#d4a574" stroke-width="0.7" opacity="0.65"/><path d="M13.2 3.3 Q13.7 3.8 13.7 4.7 L13.7 5.5" stroke="#d4a574" stroke-width="0.7" opacity="0.65"/><path d="M14 3.8 Q14.5 4.3 14.5 5.2 L14.5 6" stroke="#d4a574" stroke-width="0.7" opacity="0.65"/><path d="M5.5 16 L5.5 17.8 M14.5 16 L14.5 17.8" stroke="#8b9d77" stroke-width="2"/>`,

        // Potato - textured oval
        'potato': `<ellipse cx="10" cy="10" rx="6" ry="5" fill="${color}"/><circle cx="7.5" cy="8.5" r="0.8" fill="#1d3557" opacity="0.25"/><circle cx="11" cy="11" r="0.8" fill="#1d3557" opacity="0.25"/><circle cx="8.5" cy="12" r="0.8" fill="#1d3557" opacity="0.25"/><circle cx="12.5" cy="9" r="0.6" fill="#1d3557" opacity="0.25"/><path d="M7 9 Q6 9 6 8.5 Q6 8 6.5 8" stroke="#1d3557" stroke-width="0.4" opacity="0.2" fill="none"/>`,

        // Strawberry - detailed with seeds
        'strawberry': `<path d="M10 16 Q6 16 5 12 Q4.5 9 7 6 L13 6 Q15.5 9 15 12 Q14 16 10 16" fill="${color}"/><circle cx="8" cy="9" r="0.6" fill="#ffc300"/><circle cx="12" cy="9" r="0.6" fill="#ffc300"/><circle cx="10" cy="11" r="0.6" fill="#ffc300"/><circle cx="8.5" cy="13" r="0.6" fill="#ffc300"/><circle cx="11.5" cy="13" r="0.6" fill="#ffc300"/><circle cx="10" cy="14.5" r="0.6" fill="#ffc300"/><path d="M7 5 L10 5 L13 5 L12 2.5 L8 2.5 Z" fill="#2a9d8f"/><path d="M9 3 Q10 3.5 11 3" stroke="#1d3557" stroke-width="0.5" opacity="0.3" fill="none"/>`,

        // Herb - branching stems with leaves
        'herb': `<path d="M10 2 L10 17" stroke="${color}" stroke-width="2"/><path d="M10 5 Q7 5 6 8 Q5.5 9 6.5 9.5" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M10 5 Q13 5 14 8 Q14.5 9 13.5 9.5" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M10 9 Q7.5 9 6.5 11.5 Q6 12.5 7 13" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M10 9 Q12.5 9 13.5 11.5 Q14 12.5 13 13" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M10 13 Q8 13 7 15 M10 13 Q12 13 13 15" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,

        // Watermelon - detailed slice with thick rind layers and scattered seeds
        'watermelon': `<path d="M2.5 14.5 Q10 2.5 17.5 14.5 Z" fill="${color}"/><path d="M3.5 14.5 Q10 3.8 16.5 14.5" fill="${color}" opacity="0.85"/><path d="M4.5 14.5 Q10 5.2 15.5 14.5" fill="#2a9d8f"/><path d="M4.8 14.5 Q10 5.8 15.2 14.5" fill="#2a9d8f" opacity="0.8"/><path d="M5.8 14.5 Q10 7.2 14.2 14.5" fill="#f5f5f5"/><g opacity="0.95"><ellipse cx="6.8" cy="11.2" rx="0.7" ry="1.1" fill="#1d3557" transform="rotate(-20 6.8 11.2)"/><ellipse cx="8.8" cy="9.5" rx="0.7" ry="1.1" fill="#1d3557" transform="rotate(-10 8.8 9.5)"/><ellipse cx="11.2" cy="9.5" rx="0.7" ry="1.1" fill="#1d3557" transform="rotate(10 11.2 9.5)"/><ellipse cx="13.2" cy="11.2" rx="0.7" ry="1.1" fill="#1d3557" transform="rotate(20 13.2 11.2)"/><ellipse cx="7.8" cy="12.5" rx="0.6" ry="1" fill="#1d3557" transform="rotate(-25 7.8 12.5)"/><ellipse cx="10" cy="11.2" rx="0.6" ry="1" fill="#1d3557"/><ellipse cx="12.2" cy="12.5" rx="0.6" ry="1" fill="#1d3557" transform="rotate(25 12.2 12.5)"/><ellipse cx="9" cy="13" rx="0.5" ry="0.8" fill="#1d3557" transform="rotate(-15 9 13)"/><ellipse cx="11" cy="13" rx="0.5" ry="0.8" fill="#1d3557" transform="rotate(15 11 13)"/></g><path d="M2.5 14.5 L17.5 14.5" stroke="#2a9d8f" stroke-width="0.9" opacity="0.4"/>`,

        // Cantaloupe - netted texture
        'melon': `<circle cx="10" cy="10" r="6.5" fill="${color}"/><path d="M6 6 Q10 10 14 6 M6 10 L14 10 M6 14 Q10 10 14 14 M4.5 8.5 Q8 10 4.5 11.5" stroke="#d97638" stroke-width="0.8" opacity="0.35"/><ellipse cx="8" cy="8" rx="2" ry="1.5" fill="#ffffff" opacity="0.2"/>`,

        // Beet - round with greens
        'beet': `<circle cx="10" cy="12" r="5" fill="${color}"/><circle cx="10" cy="12" r="3.5" fill="none" stroke="#1d3557" stroke-width="0.6" opacity="0.2"/><path d="M9 7 L8 4 M10 7 L10 3 M11 7 L12 4" stroke="#2a9d8f" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="9" cy="5" rx="1.2" ry="2" fill="#2a9d8f" opacity="0.6"/><ellipse cx="11" cy="5" rx="1.2" ry="2" fill="#2a9d8f" opacity="0.6"/>`,

        // Ginger - very knobby irregular root with multiple protrusions
        'ginger': `<path d="M5 10.5 Q5 8.5 7 8.5 L12.5 8.5 Q14.5 8.5 14.5 10.5 Q14.5 12.8 12.5 12.8 L7 12.8 Q5 12.8 5 10.5" fill="${color}"/><path d="M7.8 8.5 Q7.8 6.8 9.3 6.5 Q10.5 6.3 10.8 8" fill="${color}" opacity="0.95"/><path d="M11.5 8.3 Q11.8 6.2 13.5 6.8 Q14.5 7.2 14.2 8.5" fill="${color}" opacity="0.95"/><path d="M6.5 12.8 Q6.3 14.5 7.8 15 Q9.2 15.3 9.8 13.5" fill="${color}" opacity="0.95"/><path d="M10.8 12.8 Q10.5 14.8 12.3 15 Q13.8 15.2 14 13.2" fill="${color}" opacity="0.95"/><g opacity="0.35"><line x1="7" y1="9.5" x2="12" y2="9.5" stroke="#1d3557" stroke-width="0.6"/><line x1="7" y1="11" x2="12" y2="11" stroke="#1d3557" stroke-width="0.6"/><line x1="7.5" y1="10.2" x2="12.5" y2="10.2" stroke="#1d3557" stroke-width="0.5"/><line x1="7.5" y1="11.8" x2="12.5" y2="11.8" stroke="#1d3557" stroke-width="0.5"/></g><circle cx="8.5" cy="10.5" r="0.8" fill="${color}" opacity="0.7"/><circle cx="11" cy="10.8" r="0.7" fill="${color}" opacity="0.7"/>`,

        // Default vegetable
        'default': `<circle cx="10" cy="10" r="6" fill="${color}"/><path d="M10 3 L10 6" stroke="#2a9d8f" stroke-width="2"/>`
    };

    svg.innerHTML = icons[type] || icons['default'];
    return svg;
}

function getPlantIcon(plantName) {
    const iconMap = {
        // Tomatoes & Nightshades
        'Tomatoes': { type: 'tomato', color: '#e63946' },
        'Peppers': { type: 'pepper', color: '#c1604a' },
        'Eggplant': { type: 'eggplant', color: '#722f37' },

        // Cucurbits
        'Cucumbers': { type: 'cucumber', color: '#2a9d8f' },
        'Squash (summer)': { type: 'squash', color: '#ffc300' },
        'Squash (winter)': { type: 'squash', color: '#d97638' },
        'Pumpkin': { type: 'pumpkin', color: '#d97638' },
        'Watermelon': { type: 'watermelon', color: '#e63946' },
        'Cantaloupe': { type: 'melon', color: '#ffc300' },

        // Leafy Greens (first 15 - unique detailed icons)
        'Arugula': { type: 'arugula', color: '#2a9d8f' },
        'Lettuce, head': { type: 'lettuce-head', color: '#8b9d77' },
        'Lettuce, leaf': { type: 'lettuce-leaf', color: '#8b9d77' },
        'Spinach': { type: 'spinach', color: '#2a9d8f' },
        'Kale': { type: 'kale', color: '#1d3557' },
        'Collard greens': { type: 'collard', color: '#2a9d8f' },
        'Bok choy': { type: 'bokchoy', color: '#8b9d77' },
        'Mustard': { type: 'mustard', color: '#8b9d77' },
        'Chard, Swiss': { type: 'chard', color: '#8b9d77' },

        // Brassicas (next 15 - unique detailed icons)
        'Cabbage': { type: 'cabbage', color: '#8b9d77' },
        'Cabbage (chinese)': { type: 'bokchoy', color: '#8b9d77' },
        'Broccoli': { type: 'broccoli', color: '#2a9d8f' },
        'Cauliflower': { type: 'cauliflower', color: '#f5f5f5' },
        'Brussels': { type: 'leafy', color: '#8b9d77' },
        'Kohlrabi': { type: 'kohlrabi', color: '#9d84b7' },

        // Root Vegetables (next 15 - unique detailed icons)
        'Carrots': { type: 'carrot', color: '#d97638' },
        'Radishes': { type: 'radish', color: '#e63946' },
        'Beets': { type: 'beet', color: '#722f37' },
        'Turnips': { type: 'turnip', color: '#9d84b7' },
        'Parsnips': { type: 'parsnip', color: '#f5f5f5' },
        'Rutabaga': { type: 'rutabaga', color: '#d4a574' },

        // Alliums (first 15 - unique detailed icons)
        'Onions, green': { type: 'scallion', color: '#2a9d8f' },
        'Onions, bulb': { type: 'onion-bulb', color: '#ffc300' },
        'Garlic': { type: 'garlic', color: '#f5f5f5' },
        'Leek': { type: 'leek', color: '#8b9d77' },
        'Chives': { type: 'chives', color: '#2a9d8f' },

        // Legumes (next 15 - unique detailed icons)
        'Snap pea (bush)': { type: 'snappea', color: '#8b9d77' },
        'Snap pea (pole)': { type: 'snappea', color: '#8b9d77' },
        'Peas, vining': { type: 'peas-vining', color: '#8b9d77' },
        'Peas, bush': { type: 'peas-bush', color: '#8b9d77' },
        'Peas (field)': { type: 'fieldpeas', color: '#8b9d77' },
        'Lima bean (pole)': { type: 'limabean', color: '#d4a574' },
        'Lima bean (bush)': { type: 'limabean', color: '#d4a574' },

        // Herbs (next 15 - unique detailed icons)
        'Basil': { type: 'basil', color: '#2a9d8f' },
        'Cilantro': { type: 'cilantro', color: '#2a9d8f' },
        'Parsley': { type: 'parsley', color: '#2a9d8f' },
        'Dill': { type: 'dill', color: '#2a9d8f' },
        'Sage': { type: 'sage', color: '#8b9d77' },
        'Fennel': { type: 'fennel', color: '#8b9d77' },

        // Other Vegetables (first 15 - unique detailed icons)
        'Celery': { type: 'celery', color: '#8b9d77' },
        'Corn (sweet)': { type: 'corn', color: '#ffc300' },
        'Potatoes (Irish)': { type: 'potato', color: '#d4a574' },
        'Potatoes (sweet)': { type: 'potato', color: '#d97638' },
        'Strawberries (bare-root)': { type: 'strawberry', color: '#e63946' },
        'Okra': { type: 'okra', color: '#8b9d77' },
        'Ginger': { type: 'ginger', color: '#d4a574' }
    };

    // Check for exact match first
    if (iconMap[plantName]) {
        return createSVGIcon(iconMap[plantName].type, iconMap[plantName].color);
    }

    // Check for partial matches
    for (const [key, config] of Object.entries(iconMap)) {
        if (plantName.includes(key)) {
            return createSVGIcon(config.type, config.color);
        }
    }

    // Default icon
    return createSVGIcon('default', '#2a9d8f');
}

function getFlowerIcon(plantName) {
    const flowerIconMap = {
        // Sunflower - large circular with center
        'Sunflower': { type: 'sunflower', color: '#ffc300' },

        // Zinnias - multi-petal
        'Zinnias': { type: 'zinnia', color: '#e63946' },

        // Marigolds - rounded petals
        'Marigolds': { type: 'marigold', color: '#d97638' },

        // Nasturtium - round petals
        'Nasturtium': { type: 'nasturtium', color: '#d97638' },

        // Yarrow - cluster
        'Yarrow': { type: 'yarrow', color: '#f5f5f5' },

        // Echinacea - coneflower
        'Echinacea': { type: 'echinacea', color: '#9d84b7' },

        // Chamomile - daisy-like
        'Chamomile': { type: 'chamomile', color: '#f5f5f5' },

        // MoonFlower - trumpet
        'MoonFlower': { type: 'moonflower', color: '#f5f5f5' },

        // Borage - star-shaped
        'Borage': { type: 'borage', color: '#5b8ec4' }
    };

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.setAttribute("fill", "none");
    svg.style.display = "inline-block";
    svg.style.verticalAlign = "middle";

    const flowerSVGs = {
        'sunflower': (color) => `<circle cx="10" cy="10" r="3.5" fill="#d97638"/><circle cx="10" cy="10" r="2" fill="#1d3557"/><path d="M10 2 L10 6 M10 14 L10 18 M2 10 L6 10 M14 10 L18 10 M4 4 L7 7 M13 13 L16 16 M16 4 L13 7 M7 13 L4 16" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/><circle cx="10" cy="10" r="1" fill="#ffc300"/>`,

        'zinnia': (color) => `<circle cx="10" cy="10" r="2" fill="#ffc300"/><ellipse cx="10" cy="5" rx="2" ry="4" fill="${color}"/><ellipse cx="10" cy="15" rx="2" ry="4" fill="${color}"/><ellipse cx="5" cy="10" rx="4" ry="2" fill="${color}"/><ellipse cx="15" cy="10" rx="4" ry="2" fill="${color}"/><ellipse cx="7" cy="7" rx="2.8" ry="2.8" fill="${color}" transform="rotate(-45 7 7)"/><ellipse cx="13" cy="13" rx="2.8" ry="2.8" fill="${color}" transform="rotate(-45 13 13)"/><ellipse cx="13" cy="7" rx="2.8" ry="2.8" fill="${color}" transform="rotate(45 13 7)"/><ellipse cx="7" cy="13" rx="2.8" ry="2.8" fill="${color}" transform="rotate(45 7 13)"/>`,

        'marigold': (color) => `<circle cx="10" cy="10" r="2.5" fill="#ffc300"/><path d="M10 3 Q9 6 10 7 M10 13 Q9 14 10 17 M3 10 Q6 9 7 10 M13 10 Q14 9 17 10 M5 5 Q7 7 8 8 M12 12 Q13 13 15 15 M15 5 Q13 7 12 8 M8 12 Q7 13 5 15" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M10 5 Q8.5 7.5 10 8 M10 12 Q8.5 12.5 10 15 M5 10 Q7.5 8.5 8 10 M12 10 Q12.5 8.5 15 10" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,

        'nasturtium': (color) => `<circle cx="10" cy="10" r="6.5" fill="${color}" opacity="0.8"/><circle cx="10" cy="10" r="3.5" fill="${color}"/><path d="M10 3 L10 6.5 M17 10 L13.5 10 M10 17 L10 13.5 M3 10 L6.5 10" stroke="#ffc300" stroke-width="2"/><circle cx="10" cy="10" r="1.5" fill="#d97638"/><path d="M6 6 Q8 8 10 10 M14 6 Q12 8 10 10 M14 14 Q12 12 10 10 M6 14 Q8 12 10 10" stroke="#ffffff" stroke-width="0.8" opacity="0.3"/>`,

        'yarrow': (color) => `<circle cx="10" cy="7" r="2" fill="${color}"/><circle cx="6" cy="9.5" r="1.6" fill="${color}"/><circle cx="14" cy="9.5" r="1.6" fill="${color}"/><circle cx="7.5" cy="12" r="1.3" fill="${color}"/><circle cx="12.5" cy="12" r="1.3" fill="${color}"/><circle cx="10" cy="13.5" r="1.3" fill="${color}"/><circle cx="5" cy="11.5" r="1" fill="${color}"/><circle cx="15" cy="11.5" r="1" fill="${color}"/><path d="M10 13.5 L10 18" stroke="#2a9d8f" stroke-width="1.8"/>`,

        'echinacea': (color) => `<circle cx="10" cy="10" r="2.5" fill="#d97638"/><circle cx="10" cy="10" r="1.5" fill="#722f37"/><path d="M10 2 L10 7 M10 13 L10 18 M2 10 L7 10 M13 10 L18 10 M4 4 L7.5 7.5 M12.5 12.5 L16 16 M16 4 L12.5 7.5 M7.5 12.5 L4 16" stroke="${color}" stroke-width="2" stroke-linecap="round"/><path d="M10 3 Q9 5.5 10 7 M10 13 Q9 14.5 10 17 M3 10 Q5.5 9 7 10 M13 10 Q14.5 9 17 10" stroke="${color}" stroke-width="1.2" fill="none" opacity="0.6"/>`,

        'chamomile': (color) => `<circle cx="10" cy="10" r="2.2" fill="#ffc300"/><circle cx="10" cy="10" r="1.2" fill="#d97638"/><path d="M10 3 L10 7 M10 13 L10 17 M3 10 L7 10 M13 10 L17 10 M5 5 L7.5 7.5 M12.5 12.5 L15 15 M15 5 L12.5 7.5 M7.5 12.5 L5 15" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>`,

        'moonflower': (color) => `<path d="M10 4 Q7 5.5 7 10 Q7 14.5 10 16 Q13 14.5 13 10 Q13 5.5 10 4" fill="${color}"/><path d="M10 4 Q6 4 4.5 7 Q3 10 4.5 13 Q7 16 10 16" fill="${color}" opacity="0.6"/><path d="M10 4 Q14 4 15.5 7 Q17 10 15.5 13 Q13 16 10 16" fill="${color}" opacity="0.6"/><circle cx="10" cy="10" r="2" fill="#ffc300"/><path d="M8 8 Q10 6 12 8" stroke="#ffffff" stroke-width="0.6" opacity="0.4" fill="none"/>`,

        'borage': (color) => `<path d="M10 3 L11.5 7.5 L16 8 L12.5 11 L13.5 15.5 L10 13 L6.5 15.5 L7.5 11 L4 8 L8.5 7.5 Z" fill="${color}"/><circle cx="10" cy="10" r="1.5" fill="#f5f5f5"/><path d="M9 9 L11 9 M10 8 L10 10" stroke="${color}" stroke-width="0.6"/>`
    };

    const config = flowerIconMap[plantName];
    if (config) {
        svg.innerHTML = flowerSVGs[config.type](config.color);
        return svg;
    }

    // Check for partial matches
    for (const [key, config] of Object.entries(flowerIconMap)) {
        if (plantName.includes(key)) {
            svg.innerHTML = flowerSVGs[config.type](config.color);
            return svg;
        }
    }

    // Default flower icon
    svg.innerHTML = `<circle cx="10" cy="10" r="2.5" fill="#ffc300"/><path d="M10 3 L10 7 M10 13 L10 17 M3 10 L7 10 M13 10 L17 10" stroke="#e63946" stroke-width="2" stroke-linecap="round"/>`;
    return svg;
}

function filterPlants() {
    let filtered = [...PLANTS];

    // Filter by flower visibility
    if (!state.filters.showFlowers) {
        filtered = filtered.filter(plant => plant.type !== 'flower');
    }

    // Filter by search
    if (state.filters.search) {
        const search = state.filters.search.toLowerCase();
        filtered = filtered.filter(plant =>
            plant.name.toLowerCase().includes(search)
        );
    }

    // Filter by activity
    if (state.filters.activity !== 'all') {
        filtered = filtered.filter(plant => {
            return MONTHS.some(month => {
                const monthData = plant.months[month.id];
                return monthData.half1.includes(state.filters.activity) ||
                       monthData.half2.includes(state.filters.activity);
            });
        });
    }

    state.filteredPlants = filtered;
    updateResultsSummary();
    renderCurrentView();
}

// Rendering Functions
function renderGridView() {
    const tbody = elements.gridTableBody;
    tbody.innerHTML = '';

    if (state.filteredPlants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="25" class="no-results">No plants found matching your filters</td></tr>';
        applyNowEmphasisToGrid();
        return;
    }

    state.filteredPlants.forEach(plant => {
        const row = document.createElement('tr');
        if (plant.type === 'flower') {
            row.classList.add('flower-row');
        }

        // Plant name + tooltip (Type / Spacing / Days)
        const plantHeader = document.createElement('th');
        plantHeader.className = 'sticky-col plant-col';
        plantHeader.scope = 'row';

        const spacingLabel = plant.spacing ? `${plant.spacing} in` : '—';
        const daysLabel = plant.daysToHarvest ? `${plant.daysToHarvest}` : '—';

        const tooltip = `Spacing: ${spacingLabel}\nDays to harvest: ${daysLabel}`;

        const iconContainer = document.createElement('span');
        iconContainer.className = 'plant-icon';
        iconContainer.setAttribute('aria-hidden', 'true');
        const iconSVG = plant.type === 'flower' ? getFlowerIcon(plant.name) : getPlantIcon(plant.name);
        iconContainer.appendChild(iconSVG);

        const plantName = document.createElement('span');
        plantName.className = 'plant-name';
        plantName.textContent = plant.name;
        plantName.dataset.tooltip = tooltip;
        plantName.title = tooltip;

        plantHeader.appendChild(iconContainer);
        plantHeader.appendChild(plantName);
        row.appendChild(plantHeader);

        // Month columns
        MONTHS.forEach(month => {
            const monthData = plant.months[month.id];

            // Half 1
            const half1Cell = document.createElement('td');
            if (monthData.half1.length > 0) {
                const activityDiv = document.createElement('div');
                activityDiv.className = 'activity-cell has-activity';
                const primaryActivity = monthData.half1[0];
                activityDiv.style.backgroundColor = getActivityColorValue(primaryActivity);
                activityDiv.textContent = monthData.half1.join(', ').toUpperCase();
                half1Cell.appendChild(activityDiv);
            } else {
                const activityDiv = document.createElement('div');
                activityDiv.className = 'activity-cell';
                half1Cell.appendChild(activityDiv);
            }
            row.appendChild(half1Cell);

            // Half 2
            const half2Cell = document.createElement('td');
            if (monthData.half2.length > 0) {
                const activityDiv = document.createElement('div');
                activityDiv.className = 'activity-cell has-activity';
                const primaryActivity = monthData.half2[0];
                activityDiv.style.backgroundColor = getActivityColorValue(primaryActivity);
                activityDiv.textContent = monthData.half2.join(', ').toUpperCase();
                half2Cell.appendChild(activityDiv);
            } else {
                const activityDiv = document.createElement('div');
                activityDiv.className = 'activity-cell';
                half2Cell.appendChild(activityDiv);
            }
            row.appendChild(half2Cell);
        });

        tbody.appendChild(row);
    });

    applyNowEmphasisToGrid();

    // Add click handlers to half-month headers only
    const halfMonthHeaders = elements.gridTable.querySelectorAll('thead tr.half-month-header th');
    halfMonthHeaders.forEach((header, index) => {
        if (index === 0) return; // Skip the first "Plant" column

        header.style.cursor = 'pointer';
        header.title = 'Click to view this period';

        header.addEventListener('click', () => {
            state.currentHalfMonth = index - 1; // Adjust for plant column
            switchView('month');
            renderMonthView();
        });
    });
}

function renderTimelineView() {
    const container = elements.timelineContainer;
    container.innerHTML = '';

    if (state.filteredPlants.length === 0) {
        container.innerHTML = '<div class="no-results">No plants found matching your filters</div>';
        return;
    }

    state.filteredPlants.forEach(plant => {
        const row = document.createElement('div');
        row.className = 'timeline-row';

        const plantInfo = document.createElement('div');
        plantInfo.innerHTML = `
            <div class="timeline-plant-name">${plant.name}</div>
            <div class="timeline-plant-info">
                ${plant.type === 'vegetable' ? 'Vegetable' : 'Flower'}
                ${plant.spacing ? ` • ${plant.spacing}" apart` : ''}
            </div>
        `;

        const barContainer = document.createElement('div');
        barContainer.className = 'timeline-bar-container';

        MONTHS.forEach((month, index) => {
            const monthData = plant.months[month.id];
            const monthDiv = document.createElement('div');
            monthDiv.className = 'timeline-month';

            // Half 1
            const half1 = document.createElement('div');
            half1.className = 'timeline-half';
            if (monthData.half1.length > 0) {
                const mainActivity = monthData.half1[0];
                half1.classList.add(getActivityColor(mainActivity));
                half1.textContent = monthData.half1.join(',');
            }
            monthDiv.appendChild(half1);

            // Half 2
            const half2 = document.createElement('div');
            half2.className = 'timeline-half';
            if (monthData.half2.length > 0) {
                const mainActivity = monthData.half2[0];
                half2.classList.add(getActivityColor(mainActivity));
                half2.textContent = monthData.half2.join(',');
            }
            monthDiv.appendChild(half2);

            // Month label (only show first time)
            if (index === 0 || index === 6) {
                const label = document.createElement('div');
                label.className = 'timeline-month-label';
                label.textContent = month.short;
                monthDiv.appendChild(label);
            }

            barContainer.appendChild(monthDiv);
        });

        row.appendChild(plantInfo);
        row.appendChild(barContainer);
        container.appendChild(row);
    });
}

function renderMonthView() {
    const monthIndex = Math.floor(state.currentHalfMonth / 2);
    const isFirstHalf = state.currentHalfMonth % 2 === 0;
    const monthId = MONTHS[monthIndex].id;
    const monthName = MONTHS[monthIndex].name;

    // Determine last day of month for display
    const lastDay = monthId === 'feb' ? '28' :
                   (monthId === 'apr' || monthId === 'jun' || monthId === 'sep' || monthId === 'nov') ? '30' : '31';

    const period = isFirstHalf ? '1-15' : `16-${lastDay}`;
    elements.currentMonthTitle.textContent = `${monthName} (${period})`;

    const container = elements.monthContent;
    container.innerHTML = '';

    // Group plants by activity type
    const activityGroups = {
        'si': { name: 'Sow Indoors', plants: [] },
        'sg': { name: 'Sow Greenhouse', plants: [] },
        's': { name: 'Sow Outdoors', plants: [] },
        't': { name: 'Transplant', plants: [] },
        'tg': { name: 'Transplant Greenhouse', plants: [] },
        'h': { name: 'Harvest', plants: [] }
    };

    // Collect plants for the specific half-month
    state.filteredPlants.forEach(plant => {
        const monthData = plant.months[monthId];
        const activities = isFirstHalf ? monthData.half1 : monthData.half2;

        activities.forEach(activity => {
            if (activityGroups[activity]) {
                // Check if plant already added to this activity group
                if (!activityGroups[activity].plants.find(p => p.id === plant.id)) {
                    activityGroups[activity].plants.push(plant);
                }
            }
        });
    });

    // Check if there are any activities
    const hasActivities = Object.values(activityGroups).some(group => group.plants.length > 0);
    if (!hasActivities) {
        container.innerHTML = '<div class="no-results">No planting activities for this period</div>';
        return;
    }

    // Render each activity group
    Object.entries(activityGroups).forEach(([activityCode, group]) => {
        if (group.plants.length === 0) return;

        const section = document.createElement('div');
        section.className = 'month-activity-section';

        const header = document.createElement('h3');
        header.className = 'month-activity-header';
        header.innerHTML = `<span class="legend-badge ${getActivityColor(activityCode)}">${activityCode}</span> ${group.name}`;
        section.appendChild(header);

        const plantsGrid = document.createElement('div');
        plantsGrid.className = 'month-plants-grid';

        group.plants.forEach(plant => {
            const card = document.createElement('div');
            card.className = 'month-plant-card';
            if (plant.type === 'flower') {
                card.style.backgroundColor = '#fef5e7';
            }

            const iconSVG = plant.type === 'flower' ? getFlowerIcon(plant.name) : getPlantIcon(plant.name);

            const header = document.createElement('h4');
            header.appendChild(iconSVG);
            header.appendChild(document.createTextNode(' ' + plant.name));

            const info = document.createElement('div');
            info.className = 'month-plant-info';

            if (plant.spacing) {
                const spacingSpan = document.createElement('span');
                spacingSpan.textContent = `📏 ${plant.spacing}" apart`;
                info.appendChild(spacingSpan);
            }
            if (plant.daysToHarvest) {
                const daysSpan = document.createElement('span');
                daysSpan.textContent = `⏱️ ${plant.daysToHarvest} days`;
                info.appendChild(daysSpan);
            }

            card.appendChild(header);
            card.appendChild(info);
            plantsGrid.appendChild(card);
        });

        section.appendChild(plantsGrid);
        container.appendChild(section);
    });

    // Add Tasks section
    const tasksText = isFirstHalf ? TASKS[monthId].half1 : TASKS[monthId].half2;
    if (tasksText) {
        const tasksSection = document.createElement('div');
        tasksSection.className = 'month-activity-section';

        const tasksHeader = document.createElement('h3');
        tasksHeader.className = 'month-activity-header';
        tasksHeader.innerHTML = '<span class="legend-badge" style="background-color: var(--gray-30);">📋</span> Tasks';
        tasksSection.appendChild(tasksHeader);

        const tasksGrid = document.createElement('div');
        tasksGrid.className = 'month-tasks-grid';

        // Function to add emoji based on task content
        function addTaskEmoji(task) {
            const lower = task.toLowerCase();
            if (lower.includes('order') || lower.includes('plan')) return '📦';
            if (lower.includes('prune') || lower.includes('trim') || lower.includes('cut back')) return '✂️';
            if (lower.includes('tool') || lower.includes('sharpen') || lower.includes('repair')) return '🔧';
            if (lower.includes('water') || lower.includes('irrigat') || lower.includes('drain')) return '💧';
            if (lower.includes('compost') || lower.includes('mulch') || lower.includes('leaves')) return '🍂';
            if (lower.includes('harvest')) return '🌾';
            if (lower.includes('seed') || lower.includes('sow')) return '🌱';
            if (lower.includes('weed')) return '🌿';
            if (lower.includes('greenhouse') || lower.includes('cold frame')) return '🏠';
            if (lower.includes('inspect') || lower.includes('check') || lower.includes('watch') || lower.includes('scout')) return '👀';
            if (lower.includes('pest') || lower.includes('aphid') || lower.includes('beetle') || lower.includes('worm') || lower.includes('borer')) return '🐛';
            if (lower.includes('soil') || lower.includes('amend') || lower.includes('spread')) return '🌱';
            if (lower.includes('trellis') || lower.includes('cage') || lower.includes('support')) return '🪜';
            if (lower.includes('protect') || lower.includes('cover')) return '🛡️';
            if (lower.includes('clean')) return '🧹';
            if (lower.includes('cutting')) return '✂️';
            if (lower.includes('preserve') || lower.includes('cure') || lower.includes('store') || lower.includes('dry')) return '🏺';
            if (lower.includes('rest')) return '😌';
            return '📝';
        }

        // Split by semicolon and create task cards
        tasksText.split(';').forEach(task => {
            const taskCard = document.createElement('div');
            taskCard.className = 'month-task-card';

            const emoji = addTaskEmoji(task);
            taskCard.innerHTML = `<span class="task-emoji">${emoji}</span> ${task.trim()}`;

            tasksGrid.appendChild(taskCard);
        });

        tasksSection.appendChild(tasksGrid);
        container.appendChild(tasksSection);
    }
}

function renderCurrentView() {
    switch (state.currentView) {
        case 'grid':
            renderGridView();
            break;
        case 'timeline':
            renderTimelineView();
            break;
        case 'month':
            renderMonthView();
            break;
    }
}

function switchView(view) {
    if (!viewUI[view]) return;
    state.currentView = view;
    syncViewUI(view);
    renderCurrentView();
}

function resetFilters() {
    state.filters = {
        search: '',
        showFlowers: true,
        activity: 'all'
    };

    elements.searchInput.value = '';
    elements.showFlowersCheckbox.checked = true;

    // Reset legend active state
    document.querySelectorAll('.legend-item').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.legend-item[data-activity="all"]').classList.add('active');

    filterPlants();
}

// Event Listeners
if (elements.gridViewBtn) {
    elements.gridViewBtn.addEventListener('click', () => switchView('grid'));
}
if (elements.timelineViewBtn) {
    elements.timelineViewBtn.addEventListener('click', () => switchView('timeline'));
}
if (elements.monthViewBtn) {
    elements.monthViewBtn.addEventListener('click', () => switchView('month'));
}

[elements.gridViewBtn, elements.timelineViewBtn, elements.monthViewBtn]
    .filter(Boolean)
    .forEach(btn => {
        btn.addEventListener('keydown', handleTabKeydown);
    });

if (elements.searchInput) {
    elements.searchInput.addEventListener('input', (e) => {
        state.filters.search = e.target.value;
        filterPlants();
    });
}

if (elements.showFlowersCheckbox) {
    elements.showFlowersCheckbox.addEventListener('change', (e) => {
        state.filters.showFlowers = e.target.checked;
        filterPlants();
    });
}

// Legend item click handlers for activity filtering
document.querySelectorAll('.legend-item').forEach(item => {
    item.addEventListener('click', (e) => {
        const activity = e.currentTarget.dataset.activity;
        state.filters.activity = activity;

        // Update active state
        document.querySelectorAll('.legend-item').forEach(btn => btn.classList.remove('active'));
        e.currentTarget.classList.add('active');

        filterPlants();
    });
});

if (elements.resetFilters) {
    elements.resetFilters.addEventListener('click', resetFilters);
}

if (elements.prevMonth) {
    elements.prevMonth.addEventListener('click', () => {
        state.currentHalfMonth = (state.currentHalfMonth - 1 + 24) % 24;
        renderMonthView();
    });
}

if (elements.nextMonth) {
    elements.nextMonth.addEventListener('click', () => {
        state.currentHalfMonth = (state.currentHalfMonth + 1) % 24;
        renderMonthView();
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set current half-month based on today's date
    const today = new Date();
    const monthIndex = today.getMonth();
    const isFirstHalf = today.getDate() <= 15;
    state.currentHalfMonth = monthIndex * 2 + (isFirstHalf ? 0 : 1);

    syncViewUI(state.currentView);

    // Initial render
    filterPlants();
    applyNowEmphasisToGrid();
});
