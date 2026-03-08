// State Management
let state = {
    currentView: 'grid',
    currentHalfMonth: 0, // 0-23 (12 months × 2 halves)
    filters: {
        search: '',
        showFlowers: true,
        showGreenhouse: true,
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
    showGreenhouseCheckbox: document.getElementById('showGreenhouse'),
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
// Grid view
if (elements.gridView) {
    viewUI.grid = {
        tab: elements.gridViewBtn || null,
        panel: elements.gridView
    };
}
// Timeline view (legacy)
if (elements.timelineView) {
    viewUI.timeline = {
        tab: elements.timelineViewBtn || null,
        panel: elements.timelineView
    };
}
// Month view
if (elements.monthView) {
    viewUI.month = {
        tab: elements.monthViewBtn || null,
        panel: elements.monthView
    };
}

const VIEW_ORDER = PREFERRED_VIEW_ORDER.filter(view => viewUI[view]);

const gridStickyHeader = {
    tableContainer: null,
    scrollEl: null,
    tableEl: null,
    syncRequested: false,
    isSyncingScroll: false
};

function updateResultsSummary() {
    if (!elements.resultsSummary) return;

    const total = PLANTS.length;
    const shown = state.filteredPlants.length;

    const filters = [];
    if (state.filters.search) filters.push(`search: "${state.filters.search}"`);
    if (!state.filters.showFlowers) filters.push('flowers hidden');
    if (!state.filters.showGreenhouse) filters.push('greenhouse hidden');
    if (state.filters.activity !== 'all') filters.push(`activity: ${state.filters.activity.toUpperCase()}`);

    elements.resultsSummary.textContent = filters.length
        ? `Showing ${shown} of ${total} plants. Filters: ${filters.join(', ')}.`
        : `Showing ${shown} of ${total} plants.`;
}

function updateGreenhouseFilterVisibility() {
    const greenhouseButtons = document.querySelectorAll('[data-activity="sg"], [data-activity="tg"]');
    greenhouseButtons.forEach(btn => {
        btn.style.display = state.filters.showGreenhouse ? '' : 'none';
    });
}

function syncGridStickyHeaderLayout() {
    if (!gridStickyHeader.tableContainer || !gridStickyHeader.scrollEl || !gridStickyHeader.tableEl) return;
    if (!elements.gridTable) return;

    gridStickyHeader.tableEl.style.width = `${elements.gridTable.scrollWidth}px`;
    gridStickyHeader.scrollEl.scrollLeft = gridStickyHeader.tableContainer.scrollLeft;
}

function requestGridStickyHeaderLayoutSync() {
    if (gridStickyHeader.syncRequested) return;
    gridStickyHeader.syncRequested = true;

    requestAnimationFrame(() => {
        gridStickyHeader.syncRequested = false;
        syncGridStickyHeaderLayout();
    });
}

function initGridStickyHeader() {
    const stickyRoot = document.getElementById('gridStickyHeader');
    const tableContainer = document.querySelector('#gridView .table-container');
    const gridTable = elements.gridTable;
    const gridThead = gridTable ? gridTable.querySelector('thead') : null;
    const gridColgroup = gridTable ? gridTable.querySelector('colgroup') : null;

    if (!stickyRoot || !tableContainer || !gridTable || !gridThead) return;

    const scrollEl = document.createElement('div');
    scrollEl.className = 'grid-sticky-header-scroll';

    const headerTable = document.createElement('table');
    headerTable.id = 'gridStickyHeaderTable';
    headerTable.className = gridTable.className;
    if (gridColgroup) headerTable.appendChild(gridColgroup.cloneNode(true));
    headerTable.appendChild(gridThead.cloneNode(true));

    scrollEl.appendChild(headerTable);
    stickyRoot.appendChild(scrollEl);

    gridStickyHeader.tableContainer = tableContainer;
    gridStickyHeader.scrollEl = scrollEl;
    gridStickyHeader.tableEl = headerTable;

    document.body.classList.add('has-grid-sticky-header');

    const syncScroll = (source, target) => {
        if (gridStickyHeader.isSyncingScroll) return;
        gridStickyHeader.isSyncingScroll = true;
        target.scrollLeft = source.scrollLeft;
        requestAnimationFrame(() => {
            gridStickyHeader.isSyncingScroll = false;
        });
    };

    tableContainer.addEventListener('scroll', () => {
        syncScroll(tableContainer, scrollEl);
    }, { passive: true });

    scrollEl.addEventListener('scroll', () => {
        syncScroll(scrollEl, tableContainer);
    }, { passive: true });

    window.addEventListener('resize', requestGridStickyHeaderLayoutSync);
    requestGridStickyHeaderLayoutSync();
}


function applyNowEmphasisToGrid() {
    const table = elements.gridTable;
    if (!table) return;

    const stickyHeaderTable = document.getElementById('gridStickyHeaderTable');
    const headerTables = stickyHeaderTable ? [table, stickyHeaderTable] : [table];

    headerTables.forEach(headerTable => {
        headerTable.querySelectorAll('.is-now, .is-current-month').forEach(el => {
            el.classList.remove('is-now', 'is-current-month');
        });
    });

    table.querySelectorAll('td.is-now-col').forEach(td => {
        td.classList.remove('is-now-col');
    });

    const today = new Date();
    const monthIndex = today.getMonth();
    const halfIndex = today.getDate() <= 15 ? 0 : 1;

    headerTables.forEach(headerTable => {
        // Month group header (Jan/Feb/...)
        const monthHeaderRow = headerTable.querySelector('thead tr:first-child');
        if (monthHeaderRow) {
            const monthGroupCell = monthHeaderRow.children[2 + monthIndex];
            if (monthGroupCell) monthGroupCell.classList.add('is-current-month');
        }

        // Half-month header (1-15 / 16-..)
        const halfHeaderRow = headerTable.querySelector('thead tr.half-month-header');
        if (halfHeaderRow) {
            const halfCellIndex = 2 + (monthIndex * 2) + halfIndex;
            const halfCell = halfHeaderRow.children[halfCellIndex];
            if (halfCell) halfCell.classList.add('is-now');
        }
    });

    // Body column
    const activityCellIndex = 2 + (monthIndex * 2) + halfIndex;
    const tbody = table.tBodies && table.tBodies.length ? table.tBodies[0] : table.querySelector('tbody');
    if (!tbody) return;

    Array.from(tbody.rows).forEach(row => {
        const cell = row.children[activityCellIndex];
        if (cell && cell.tagName === 'TD') cell.classList.add('is-now-col');
    });
}

function bindHalfMonthHeaderClicks(tableEl) {
    if (!tableEl) return;

    const halfMonthHeaders = tableEl.querySelectorAll('thead tr.half-month-header th');
    halfMonthHeaders.forEach((header, index) => {
        if (index < 2) return; // Skip the icon + plant columns
        if (header.dataset.boundHalfMonthClick === 'true') return;

        header.dataset.boundHalfMonthClick = 'true';
        header.style.cursor = 'pointer';
        header.title = 'Click to view this period';

        header.addEventListener('click', () => {
            state.currentHalfMonth = index - 2; // Adjust for icon + plant columns
            switchView('month');
            renderMonthView();
        });
    });
}

function syncViewUI(view) {
    VIEW_ORDER.forEach(v => {
        const isActive = v === view;
        const viewConfig = viewUI[v];

        if (!viewConfig) return;

        const { tab, panel } = viewConfig;

        if (tab) {
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', String(isActive));
            tab.tabIndex = isActive ? 0 : -1;
        }

        if (panel) {
            panel.classList.toggle('active', isActive);
            panel.hidden = !isActive;
        }
    });

    // Sync toggle checkbox
    const monthViewToggle = document.getElementById('monthViewToggle');
    if (monthViewToggle) {
        monthViewToggle.checked = view === 'month';
    }
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
function filterGreenhouseActivities(activities) {
    // Remove greenhouse activities when greenhouse filter is off
    if (!state.filters.showGreenhouse) {
        return activities.filter(a => a !== 'sg' && a !== 'tg');
    }
    return activities;
}

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
    // Simplified palette - greenhouse distinction via border, not color
    const colors = {
        'si': '#6FA8DC',  // Cornflower blue - sow indoors
        's': '#93C47D',   // Pistachio green - sow outdoors
        'sg': '#93C47D',  // Same green - greenhouse indicated by border
        't': '#B4A7D6',   // Lavender - transplant
        'tg': '#B4A7D6',  // Same lavender - greenhouse indicated by border
        'h': '#E6B84D',   // Warm gold - harvest (rarely used)
        'B': '#9B7EBD',   // Purple - bulbs
        'o': '#A8B5A8'    // Neutral sage - other
    };
    return colors[activity] || '#B4A7D6';
}

function blendColors(activities) {
    if (activities.length === 0) return '#B4A7D6';
    if (activities.length === 1) return getActivityColorValue(activities[0]);

    // Convert hex to RGB and average
    let r = 0, g = 0, b = 0;

    activities.forEach(activity => {
        const hex = getActivityColorValue(activity);
        const rgb = parseInt(hex.slice(1), 16);
        r += (rgb >> 16) & 255;
        g += (rgb >> 8) & 255;
        b += rgb & 255;
    });

    r = Math.round(r / activities.length);
    g = Math.round(g / activities.length);
    b = Math.round(b / activities.length);

    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function createActivityBadge(activity) {
    return `<span class="activity-badge ${getActivityColor(activity)}">${activity}</span>`;
}

// SVG Icon Mapping with Emoji Fallbacks
function getPlantIcon(plantName) {
    // Map plant names to SVG icon filenames
    const svgIconMap = {
        // Vegetables
        'Arugula': 'arugula',
        'Basil': 'basil',
        'Beets': 'beet',
        'Bok Choy': 'bok-choy',
        'Borage': 'borage',
        'Broccoli': 'broccoli',
        'Brussels': 'brussels',
        'Cabbage': 'cabbage',
        'Cabbage (Chinese)': 'cabbage-chinese',
        'Cantaloupe': 'cantaloupe',
        'Carrots': 'carrot',
        'Cauliflower': 'cauliflower',
        'Celery': 'celery',
        'Chamomile': 'chamomile',
        'Chard, Swiss': 'chard',
        'Chives': 'chive',
        'Cilantro': 'cilantro',
        'Collard Greens': 'collard',
        'Corn (Sweet)': 'corn',
        'Cucumbers': 'cucumber',
        'Dill': 'dill',
        'Echinacea': 'echinacea',
        'Eggplant': 'eggplant',
        'Fennel': 'fennel',
        'Garlic': 'garlic',
        'Ginger': 'ginger',
        'Kale': 'kale',
        'Kohlrabi': 'kohlrabi',
        'Leek': 'leek',
        'Lettuce, Head': 'lettuce-head',
        'Lettuce, Leaf': 'lettuce-leaf',
        'Lima Bean (Bush)': 'lima-bean',
        'Lima Bean (Pole)': 'lima-bean',
        'Mustard': 'mustard',
        'Okra': 'okra',
        'Onions, Bulb': 'onion',
        'Onions, Green': 'green-onion',
        'Parsley': 'parsley',
        'Parsnips': 'parsnip',
        'Peas (Field)': 'pea',
        'Peas, Bush': 'pea',
        'Peas, Vining': 'pea',
        'Snap Pea (Bush)': 'pea',
        'Snap Pea (Pole)': 'pea',
        'Peppers': 'pepper',
        'Potatoes (Irish)': 'potato',
        'Potatoes (Sweet)': 'sweet-potato',
        'Pumpkin': 'pumpkin',
        'Radishes': 'radish',
        'Rutabaga': 'rutabaga',
        'Sage': 'sage',
        'Spinach': 'spinach',
        'Squash (Summer)': 'summer-squash',
        'Squash (Winter)': 'winter-squash',
        'Strawberries (Bare-root)': 'strawberry',
        'Sunflower': 'sunflower',
        'Tomatoes': 'tomato',
        'Turnips': 'turnip',
        'Watermelon': 'watermelon',

        // Flowers
        'Yarrow': 'yarrow',
        'Marigolds': 'marigold',
        'Moonflower': 'moonflower.png',
        'Sunflower': 'sunflower',
        'Calendula': 'calendula.png',
        'Snapdragons': 'snapdragon.png',
        'Lavender': 'lavender.png',
        'Zinnias': 'zinnia.png'
    };

    // Emoji icons for flowers without SVG/PNG
    const emojiFlowers = {
        'Nasturtium': '🌼',       // Yellow/orange daisy
        'Stock': '🌸',            // Pink blossom for fragrant stock
        'Echinacea': '🌸',        // Purple coneflower
        'Chamomile': '🌼'         // Small white daisy
    };

    // Check for emoji flower first
    if (emojiFlowers[plantName]) {
        return { type: 'emoji', icon: emojiFlowers[plantName] };
    }

    // Check for SVG/PNG icon
    if (svgIconMap[plantName]) {
        const iconFile = svgIconMap[plantName];
        // If filename already includes extension, use as-is; otherwise add .svg
        const path = iconFile.includes('.') ? `icons/${iconFile}` : `icons/${iconFile}.svg`;
        return { type: 'svg', path: path };
    }

    // Default fallback
    return { type: 'emoji', icon: '🌱' };
}

function getFlowerIcon(plantName) {
    return getPlantIcon(plantName);
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

    // Note: Activity filtering is now handled at cell level during rendering
    // We don't filter out entire plants anymore

    state.filteredPlants = filtered;
    updateResultsSummary();
    renderCurrentView();
}

// Rendering Functions
function renderGridView() {
    const tbody = elements.gridTableBody;
    tbody.innerHTML = '';

    if (state.filteredPlants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="26" class="no-results">No plants found matching your filters</td></tr>';
        applyNowEmphasisToGrid();
        return;
    }

    state.filteredPlants.forEach(plant => {
        const row = document.createElement('tr');
        if (plant.type === 'flower') {
            row.classList.add('flower-row');
        }

        // Prepare tooltip data
        const spacingLabel = plant.spacing ? `${plant.spacing} in` : '—';
        const daysLabel = plant.daysToHarvest ? `${plant.daysToHarvest}` : '—';
        const tooltip = `Spacing: ${spacingLabel}\nDays to harvest: ${daysLabel}`;

        // Icon column (sticky)
        const iconCell = document.createElement('td');
        iconCell.className = 'sticky-col icon-col col-icon';
        iconCell.dataset.tooltip = tooltip;
        iconCell.title = tooltip;

        const iconContainer = document.createElement('span');
        iconContainer.className = 'plant-icon';
        iconContainer.setAttribute('aria-hidden', 'true');
        const iconData = plant.type === 'flower' ? getFlowerIcon(plant.name) : getPlantIcon(plant.name);

        if (iconData.type === 'svg') {
            const img = document.createElement('img');
            img.src = iconData.path;
            img.alt = plant.name;
            img.className = 'plant-icon-svg';
            iconContainer.appendChild(img);
        } else {
            iconContainer.textContent = iconData.icon;
        }

        iconCell.appendChild(iconContainer);
        row.appendChild(iconCell);

        // Plant name column (not sticky)
        const plantNameCell = document.createElement('th');
        plantNameCell.className = 'plant-col';
        plantNameCell.scope = 'row';
        plantNameCell.dataset.tooltip = tooltip;
        plantNameCell.title = tooltip;

        const plantName = document.createElement('span');
        plantName.className = 'plant-name';
        plantName.textContent = plant.name;

        plantNameCell.appendChild(plantName);

        // Make both icon cell and name cell clickable if guide data exists
        if (hasGuideData(plant.name)) {
            bindPlantDetailTrigger(iconCell, plant);
            bindPlantDetailTrigger(plantNameCell, plant);
        }

        row.appendChild(plantNameCell);

        // Month columns
        MONTHS.forEach(month => {
            const monthData = plant.months[month.id];

            // Half 1
            const half1Cell = document.createElement('td');
            const filteredHalf1 = filterGreenhouseActivities(monthData.half1);
            const hasHalf1Activity = filteredHalf1.length > 0;
            const matchesFilter = state.filters.activity === 'all' || monthData.half1.includes(state.filters.activity);

            if (hasHalf1Activity) {
                const activityDiv = document.createElement('div');
                const isGreenhouse = state.filters.showGreenhouse && monthData.half1.some(a => a === 'sg' || a === 'tg');

                // Only show color if cell matches activity filter
                if (matchesFilter) {
                    activityDiv.className = isGreenhouse ? 'activity-cell has-activity greenhouse' : 'activity-cell has-activity';
                    activityDiv.style.backgroundColor = blendColors(filteredHalf1);
                    activityDiv.textContent = filteredHalf1.join(', ').toUpperCase();
                } else {
                    // Faded out when not matching filter
                    activityDiv.className = 'activity-cell has-activity filtered-out';
                    activityDiv.textContent = filteredHalf1.join(', ').toUpperCase();
                }
                half1Cell.appendChild(activityDiv);
            } else {
                const activityDiv = document.createElement('div');
                activityDiv.className = 'activity-cell';
                half1Cell.appendChild(activityDiv);
            }
            row.appendChild(half1Cell);

            // Half 2
            const half2Cell = document.createElement('td');
            const filteredHalf2 = filterGreenhouseActivities(monthData.half2);
            const hasHalf2Activity = filteredHalf2.length > 0;
            const matchesFilter2 = state.filters.activity === 'all' || monthData.half2.includes(state.filters.activity);

            if (hasHalf2Activity) {
                const activityDiv = document.createElement('div');
                const isGreenhouse = state.filters.showGreenhouse && monthData.half2.some(a => a === 'sg' || a === 'tg');

                // Only show color if cell matches activity filter
                if (matchesFilter2) {
                    activityDiv.className = isGreenhouse ? 'activity-cell has-activity greenhouse' : 'activity-cell has-activity';
                    activityDiv.style.backgroundColor = blendColors(filteredHalf2);
                    activityDiv.textContent = filteredHalf2.join(', ').toUpperCase();
                } else {
                    // Faded out when not matching filter
                    activityDiv.className = 'activity-cell has-activity filtered-out';
                    activityDiv.textContent = filteredHalf2.join(', ').toUpperCase();
                }
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

    bindHalfMonthHeaderClicks(document.getElementById('gridStickyHeaderTable'));
    bindHalfMonthHeaderClicks(elements.gridTable);
    requestGridStickyHeaderLayoutSync();
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
            card.className = plant.type === 'flower' ? 'month-plant-card flower-card' : 'month-plant-card';

            const iconData = plant.type === 'flower' ? getFlowerIcon(plant.name) : getPlantIcon(plant.name);

            // Icon container (left side)
            const iconContainer = document.createElement('div');
            iconContainer.className = 'month-plant-icon-container';

            if (iconData.type === 'svg') {
                const img = document.createElement('img');
                img.src = iconData.path;
                img.alt = plant.name;
                img.className = 'month-plant-icon-svg';
                iconContainer.appendChild(img);
            } else {
                iconContainer.textContent = iconData.icon;
            }

            // Info container (right side)
            const infoContainer = document.createElement('div');
            infoContainer.className = 'month-plant-info-container';

            const nameEl = document.createElement('div');
            nameEl.className = 'month-plant-name';
            nameEl.textContent = plant.name;

            infoContainer.appendChild(nameEl);

            if (plant.spacing) {
                const spacingEl = document.createElement('div');
                spacingEl.className = 'month-plant-spacing';
                spacingEl.textContent = `${plant.spacing}" apart`;
                infoContainer.appendChild(spacingEl);
            }

            if (plant.daysToHarvest) {
                const daysEl = document.createElement('div');
                daysEl.className = 'month-plant-days';
                daysEl.textContent = plant.daysToHarvest;
                infoContainer.appendChild(daysEl);
            }

            card.appendChild(iconContainer);
            card.appendChild(infoContainer);

            // Make entire card clickable if guide data exists
            if (hasGuideData(plant.name)) {
                bindPlantDetailTrigger(card, plant);
            }

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
        showGreenhouse: true,
        activity: 'all'
    };

    elements.searchInput.value = '';
    elements.showFlowersCheckbox.checked = true;
    elements.showGreenhouseCheckbox.checked = true;

    // Reset legend active state (remove all active states)
    document.querySelectorAll('.legend-item').forEach(btn => btn.classList.remove('active'));

    updateGreenhouseFilterVisibility();
    filterPlants();
}

// Event Listeners
// Month view toggle checkbox
const monthViewToggle = document.getElementById('monthViewToggle');
if (monthViewToggle) {
    monthViewToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            switchView('month');
        } else {
            switchView('grid');
        }
    });
}

// Legacy button support (if they exist)
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

if (elements.showGreenhouseCheckbox) {
    elements.showGreenhouseCheckbox.addEventListener('change', (e) => {
        state.filters.showGreenhouse = e.target.checked;

        // If greenhouse is turned off and a greenhouse activity is selected, reset to 'all'
        if (!e.target.checked && (state.filters.activity === 'sg' || state.filters.activity === 'tg')) {
            state.filters.activity = 'all';
            document.querySelectorAll('.legend-item').forEach(btn => btn.classList.remove('active'));
        }

        updateGreenhouseFilterVisibility();
        filterPlants();
    });
}

// Legend item click handlers for activity filtering (with toggle)
document.querySelectorAll('.legend-item').forEach(item => {
    item.addEventListener('click', (e) => {
        const activity = e.currentTarget.dataset.activity;
        const isActive = e.currentTarget.classList.contains('active');

        if (isActive) {
            // Toggle off - deactivate and show all
            e.currentTarget.classList.remove('active');
            state.filters.activity = 'all';
        } else {
            // Activate this filter
            document.querySelectorAll('.legend-item').forEach(btn => btn.classList.remove('active'));
            e.currentTarget.classList.add('active');
            state.filters.activity = activity;
        }

        filterPlants();
    });
});

if (elements.resetFilters) {
    elements.resetFilters.addEventListener('click', resetFilters);
}

// Search toggle for mobile
const searchToggle = document.getElementById('searchToggle');
if (searchToggle) {
    searchToggle.addEventListener('click', () => {
        const filterControls = document.querySelector('.filter-controls');
        filterControls.classList.toggle('search-expanded');
        if (filterControls.classList.contains('search-expanded')) {
            elements.searchInput.focus();
        }
    });
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
// Column hover effect
function initColumnHover() {
    const table = elements.gridTable;
    if (!table) return;

    let currentHoverColumn = null;

    function highlightColumn(columnIndex) {
        // Highlight all cells in this column
        const headers = table.querySelectorAll(`thead tr th:nth-child(${columnIndex + 1})`);
        const cells = table.querySelectorAll(`tbody tr td:nth-child(${columnIndex + 1})`);

        headers.forEach(th => th.classList.add('column-hover'));
        cells.forEach(td => td.classList.add('column-hover'));
    }

    function clearColumnHover() {
        const highlighted = table.querySelectorAll('.column-hover');
        highlighted.forEach(el => el.classList.remove('column-hover'));
    }

    // Add hover listeners to the table
    table.addEventListener('mouseover', (e) => {
        const target = e.target.closest('th, td');
        if (!target) return;

        // Skip icon and plant columns
        if (target.classList.contains('icon-col') ||
            target.classList.contains('plant-col') ||
            target.classList.contains('sticky-col') ||
            target.classList.contains('col-icon')) {
            clearColumnHover();
            currentHoverColumn = null;
            return;
        }

        // Get the column index
        const row = target.parentElement;
        const cellIndex = Array.from(row.children).indexOf(target);

        // Only highlight half-month columns (index >= 2)
        if (cellIndex < 2) {
            clearColumnHover();
            currentHoverColumn = null;
            return;
        }

        // Only update if different column
        if (currentHoverColumn !== cellIndex) {
            clearColumnHover();
            currentHoverColumn = cellIndex;
            highlightColumn(cellIndex);
        }
    });

    // Clear on mouse leave
    table.addEventListener('mouseleave', () => {
        clearColumnHover();
        currentHoverColumn = null;
    });
}

// ============================================
// Plant Detail Panel Functions
// ============================================

const plantDetailPanelState = {
    currentPlant: null,
    returnFocusEl: null
};

function isPlantDetailPanelOpen() {
    const panel = document.getElementById('plantDetailPanel');
    return !!(panel && !panel.hasAttribute('hidden'));
}

function bindPlantDetailTrigger(el, plant) {
    if (!el) return;

    el.classList.add('plant-name-clickable');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-haspopup', 'dialog');
    el.tabIndex = 0;

    const open = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openPlantDetailPanel(plant);
    };

    el.addEventListener('click', open);
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open(e);
        }
    });
}

function formatSpacingForDisplay(spacing) {
    if (!spacing) return '—';
    const normalized = String(spacing).trim();
    if (!normalized) return '—';
    if (/[a-z]/i.test(normalized)) return normalized;
    return `${normalized.replace(/-/g, '–')} in`;
}

function splitCommaOutsideParens(text) {
    const value = String(text || '').trim();
    if (!value) return [];

    const items = [];
    let depth = 0;
    let current = '';

    for (const ch of value) {
        if (ch === '(') depth += 1;
        if (ch === ')') depth = Math.max(0, depth - 1);

        if (ch === ',' && depth === 0) {
            const trimmed = current.trim();
            if (trimmed) items.push(trimmed);
            current = '';
            continue;
        }

        current += ch;
    }

    const trimmed = current.trim();
    if (trimmed) items.push(trimmed);
    return items;
}

function renderPlantDetailGuide(plant) {
    const panelVarieties = document.getElementById('panelVarieties');
    const panelTips = document.getElementById('panelTips');

    const guideData = getPlantGuide(plant.name);

    panelVarieties.innerHTML = '';
    if (guideData && guideData.varietiesText) {
        const list = document.createElement('ul');
        list.className = 'panel-bullets';
        splitCommaOutsideParens(guideData.varietiesText).forEach(itemText => {
            const li = document.createElement('li');
            li.textContent = itemText;
            list.appendChild(li);
        });
        panelVarieties.appendChild(list);
    } else {
        panelVarieties.innerHTML = '<div class="panel-empty-note">No variety notes yet.</div>';
    }

    panelTips.innerHTML = '';
    if (guideData && guideData.tipsText) {
        const list = document.createElement('ul');
        list.className = 'panel-bullets';
        guideData.tipsText
            .split('. ')
            .map(s => s.trim())
            .filter(Boolean)
            .forEach(sentence => {
                const li = document.createElement('li');
                li.textContent = sentence.endsWith('.') ? sentence : `${sentence}.`;
                list.appendChild(li);
            });
        panelTips.appendChild(list);
    } else {
        panelTips.innerHTML = '<div class="panel-empty-note">No growing tips yet.</div>';
    }
}

function renderPlantDetailPanelContent(plant) {
    const panelPlantName = document.getElementById('panelPlantName');
    const panelPlantIcon = document.getElementById('panelPlantIcon');
    const panelSpacing = document.getElementById('panelSpacing');
    const panelDaysToHarvest = document.getElementById('panelDaysToHarvest');

    panelPlantName.textContent = plant.name;

    const iconData = plant.type === 'flower' ? getFlowerIcon(plant.name) : getPlantIcon(plant.name);
    panelPlantIcon.innerHTML = '';
    if (iconData.type === 'svg') {
        const img = document.createElement('img');
        img.src = iconData.path;
        img.alt = plant.name;
        panelPlantIcon.appendChild(img);
    } else {
        panelPlantIcon.textContent = iconData.icon;
    }

    panelSpacing.textContent = formatSpacingForDisplay(plant.spacing);
    panelDaysToHarvest.textContent = plant.daysToHarvest || '—';

    renderPlantDetailGuide(plant);
}

function openPlantDetailPanel(plant) {
    const panel = document.getElementById('plantDetailPanel');
    const closePanelBtn = document.getElementById('closePanelBtn');
    if (!panel) return;

    plantDetailPanelState.returnFocusEl = document.activeElement;
    plantDetailPanelState.currentPlant = plant;

    renderPlantDetailPanelContent(plant);

    panel.removeAttribute('hidden');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('panel-open');

    if (closePanelBtn) {
        closePanelBtn.focus({ preventScroll: true });
    }
}

function closePlantDetailPanel() {
    const panel = document.getElementById('plantDetailPanel');
    if (!panel) return;

    panel.setAttribute('hidden', '');
    panel.setAttribute('aria-hidden', 'true');

    // Wait for animation to finish before restoring focus
    setTimeout(() => {
        document.body.classList.remove('panel-open');

        if (panel.hasAttribute('hidden')) {
            panel.hidden = true;
        }

        const returnFocusEl = plantDetailPanelState.returnFocusEl;
        plantDetailPanelState.currentPlant = null;
        plantDetailPanelState.returnFocusEl = null;

        if (returnFocusEl && document.contains(returnFocusEl)) {
            returnFocusEl.focus({ preventScroll: true });
        }
    }, 300);
}

function initPlantDetailPanel() {
    const closePanelBtn = document.getElementById('closePanelBtn');
    const panelOverlay = document.getElementById('panelOverlay');
    const panel = document.getElementById('plantDetailPanel');

    if (!closePanelBtn || !panelOverlay || !panel) return;

    // Close button
    closePanelBtn.addEventListener('click', closePlantDetailPanel);

    // Click overlay to close
    panelOverlay.addEventListener('click', closePlantDetailPanel);

    // ESC key to close
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (panel.hasAttribute('hidden')) return;
        closePlantDetailPanel();
    });

    // Focus trap while panel is open
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        if (panel.hasAttribute('hidden')) return;

        const focusables = Array.from(
            panel.querySelectorAll(
                'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
        ).filter(el => el.getClientRects().length > 0);

        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;

        if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus();
            return;
        }

        if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Set current half-month based on today's date
    const today = new Date();
    const monthIndex = today.getMonth();
    const isFirstHalf = today.getDate() <= 15;
    state.currentHalfMonth = monthIndex * 2 + (isFirstHalf ? 0 : 1);

    syncViewUI(state.currentView);

    // Initial render
    initGridStickyHeader();
    initColumnHover();
    initPlantDetailPanel();
    updateGreenhouseFilterVisibility();
    filterPlants();
    applyNowEmphasisToGrid();
});
