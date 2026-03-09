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

const CURRENT_DATASET = window.__APP_DATASET__ || 'v1';

const PREFERRED_VIEW_ORDER = ['grid', 'timeline', 'month'];
const DEER_FRIENDLY_FLOWERS = new Set([
    'Snapdragons',
    'Lavender',
    'Stock',
    'Yarrow',
    'Calendula',
    'Marigolds',
    'Echinacea',
    'Chamomile',
    'Borage'
]);

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
    if (state.filters.activity !== 'all') filters.push(`activity: ${getDisplayActivityCode(state.filters.activity).toUpperCase()}`);

    elements.resultsSummary.textContent = filters.length
        ? `Showing ${shown} of ${total} plants. Filters: ${filters.join(', ')}.`
        : `Showing ${shown} of ${total} plants.`;
}

function isDeerFriendlyFlower(plant) {
    return plant.type === 'flower' && DEER_FRIENDLY_FLOWERS.has(plant.name);
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

function initDatasetSwitch() {
    const datasetButtons = Array.from(document.querySelectorAll('.dataset-switch-btn'));
    if (datasetButtons.length === 0) return;

    datasetButtons.forEach(btn => {
        const isActive = btn.dataset.dataset === CURRENT_DATASET;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));

        btn.addEventListener('click', () => {
            const nextDataset = btn.dataset.dataset;
            if (!nextDataset || nextDataset === CURRENT_DATASET) return;

            const nextUrl = new URL(window.location.href);
            if (nextDataset === 'v2') {
                nextUrl.searchParams.delete('dataset');
            } else {
                nextUrl.searchParams.set('dataset', nextDataset);
            }

            window.location.href = nextUrl.toString();
        });
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

function normalizeActivityCode(activity) {
    if (activity === 'o') return '*';
    if (activity === 'B') return 's';
    return activity;
}

function getDisplayActivityCode(activity) {
    if (activity === 'o') return '*';
    if (activity === 'B') return 's/b';
    return activity;
}

function formatActivityList(activities) {
    return activities.map(getDisplayActivityCode).join(', ').toUpperCase();
}

function getNormalizedHalfMonthActivities(plant, halfMonthIndex) {
    if (halfMonthIndex < 0 || halfMonthIndex >= MONTHS.length * 2) {
        return [];
    }

    const monthIndex = Math.floor(halfMonthIndex / 2);
    const isFirstHalf = halfMonthIndex % 2 === 0;
    const monthId = MONTHS[monthIndex].id;
    const monthData = plant.months[monthId];

    if (!monthData) {
        return [];
    }

    const activities = isFirstHalf ? monthData.half1 : monthData.half2;
    return activities.map(normalizeActivityCode);
}

function getMonthViewEdgeState(plant, activityCode, halfMonthIndex) {
    const normalizedActivity = normalizeActivityCode(activityCode);
    const previousActivities = getNormalizedHalfMonthActivities(plant, halfMonthIndex - 1);
    const nextActivities = getNormalizedHalfMonthActivities(plant, halfMonthIndex + 1);

    return {
        startsNow: !previousActivities.includes(normalizedActivity),
        endsNow: !nextActivities.includes(normalizedActivity)
    };
}

function sortMonthGroupPlants(plants, activityCode, halfMonthIndex) {
    const confidenceRank = {
        high: 0,
        medium: 1,
        low: 2
    };

    const getStageRank = (edgeState) => {
        if (edgeState.startsNow && !edgeState.endsNow) return 0;
        if (!edgeState.startsNow && !edgeState.endsNow) return 1;
        if (edgeState.endsNow && !edgeState.startsNow) return 2;

        // Single-window items count as "new" so they surface at the front.
        return 0;
    };

    return [...plants].sort((leftPlant, rightPlant) => {
        const leftEdgeState = getMonthViewEdgeState(leftPlant, activityCode, halfMonthIndex);
        const rightEdgeState = getMonthViewEdgeState(rightPlant, activityCode, halfMonthIndex);
        const stageComparison = getStageRank(leftEdgeState) - getStageRank(rightEdgeState);
        if (stageComparison !== 0) return stageComparison;

        const typeComparison = Number(leftPlant.type !== 'vegetable') - Number(rightPlant.type !== 'vegetable');
        if (typeComparison !== 0) return typeComparison;

        const leftConfidence = getPlantReviewConfidenceMeta(leftPlant.name)?.value ?? null;
        const rightConfidence = getPlantReviewConfidenceMeta(rightPlant.name)?.value ?? null;
        const leftConfidenceRank = leftConfidence in confidenceRank ? confidenceRank[leftConfidence] : Number.MAX_SAFE_INTEGER;
        const rightConfidenceRank = rightConfidence in confidenceRank ? confidenceRank[rightConfidence] : Number.MAX_SAFE_INTEGER;
        const confidenceComparison = leftConfidenceRank - rightConfidenceRank;

        if (confidenceComparison !== 0) return confidenceComparison;

        return leftPlant.name.localeCompare(rightPlant.name);
    });
}

function getFirstActiveHalfMonth(plant) {
    for (let monthIndex = 0; monthIndex < MONTHS.length; monthIndex += 1) {
        const monthId = MONTHS[monthIndex].id;
        const monthData = plant.months[monthId];

        if (!monthData) continue;
        if (monthData.half1.length > 0) return monthIndex * 2;
        if (monthData.half2.length > 0) return monthIndex * 2 + 1;
    }

    return Number.MAX_SAFE_INTEGER;
}

function getFirstActiveActivities(plant) {
    const firstHalfMonth = getFirstActiveHalfMonth(plant);
    if (!Number.isFinite(firstHalfMonth) || firstHalfMonth === Number.MAX_SAFE_INTEGER) {
        return [];
    }

    const monthIndex = Math.floor(firstHalfMonth / 2);
    const isFirstHalf = firstHalfMonth % 2 === 0;
    const monthId = MONTHS[monthIndex].id;
    const monthData = plant.months[monthId];

    if (!monthData) {
        return [];
    }

    return (isFirstHalf ? monthData.half1 : monthData.half2).map(normalizeActivityCode);
}

function getGridGroupKey(plant) {
    const normalizedName = plant.name.toLowerCase();
    const groupMatchers = [
        [/pea/, 'pea'],
        [/lettuce/, 'lettuce'],
        [/onion/, 'onion'],
        [/squash/, 'squash'],
        [/cabbage/, 'cabbage'],
        [/bean/, 'bean'],
        [/potato/, 'potato'],
        [/tomato/, 'tomato'],
        [/pepper/, 'pepper'],
        [/melon|cantaloupe|watermelon/, 'melon'],
        [/brassel|brussels|broccoli|cauliflower|kale|collard|bok choy|kohlrabi|rutabaga|turnip|mustard/, 'brassica'],
        [/carrot|beet|radish|parsnip/, 'root'],
        [/basil|cilantro|dill|fennel|parsley|sage|chive/, 'herb'],
        [/sunflower|zinnia|nasturtium|marigold|snapdragon|stock|yarrow|lavender|echinacea|chamomile|moonflower|calendula|borage/, 'flower']
    ];

    for (const [matcher, groupKey] of groupMatchers) {
        if (matcher.test(normalizedName)) {
            return groupKey;
        }
    }

    return normalizedName
        .replace(/\([^)]*\)/g, '')
        .replace(/,/g, ' ')
        .trim();
}

function sortGridPlants(plants) {
    const firstActivityRank = {
        si: 0,
        s: 1,
        t: 2,
        h: 3,
        sg: 4,
        tg: 5,
        '*': 6
    };

    const getFirstActivityRank = (plant) => {
        const activities = getFirstActiveActivities(plant);
        if (activities.length === 0) return Number.MAX_SAFE_INTEGER;

        const ranks = activities.map(activity => {
            return activity in firstActivityRank ? firstActivityRank[activity] : Number.MAX_SAFE_INTEGER;
        });

        return Math.min(...ranks);
    };

    return [...plants].sort((leftPlant, rightPlant) => {
        const firstHalfMonthComparison = getFirstActiveHalfMonth(leftPlant) - getFirstActiveHalfMonth(rightPlant);
        if (firstHalfMonthComparison !== 0) return firstHalfMonthComparison;

        const firstActivityComparison = getFirstActivityRank(leftPlant) - getFirstActivityRank(rightPlant);
        if (firstActivityComparison !== 0) return firstActivityComparison;

        const groupComparison = getGridGroupKey(leftPlant).localeCompare(getGridGroupKey(rightPlant));
        if (groupComparison !== 0) return groupComparison;

        const typeComparison = Number(leftPlant.type !== 'vegetable') - Number(rightPlant.type !== 'vegetable');
        if (typeComparison !== 0) return typeComparison;

        return leftPlant.name.localeCompare(rightPlant.name);
    });
}

function renderActivityTokens(container, activities, { compact = false } = {}) {
    container.replaceChildren();

    activities.forEach((activity, index) => {
        if (index > 0) {
            container.appendChild(document.createTextNode(compact ? ',' : ', '));
        }

        const token = document.createElement('span');
        token.className = 'activity-token';

        if (activity === 'h') {
            token.classList.add('activity-token-h');
        }

        token.textContent = getDisplayActivityCode(activity).toUpperCase();
        container.appendChild(token);
    });
}

function getPrimaryVisualActivity(activities) {
    const nonHarvestActivities = activities.filter(activity => activity !== 'h');
    return nonHarvestActivities[0] || activities[0] || null;
}

function applyActivityCellVisuals(activityDiv, activities, { greenhouse = false, filteredOut = false } = {}) {
    const hasHarvest = activities.includes('h');
    const backgroundActivities = activities.filter(activity => activity !== 'h');
    const harvestOnly = hasHarvest && backgroundActivities.length === 0;

    if (filteredOut) {
        activityDiv.className = 'activity-cell has-activity filtered-out';
    } else {
        activityDiv.className = greenhouse ? 'activity-cell has-activity greenhouse' : 'activity-cell has-activity';
        activityDiv.style.backgroundColor = harvestOnly
            ? 'var(--color-h)'
            : backgroundActivities.length > 0
                ? blendColors(backgroundActivities)
                : 'transparent';
    }

    if (harvestOnly) {
        activityDiv.classList.add('harvest-only');
    }

    renderActivityTokens(activityDiv, activities);
}

function getActivityColor(activity) {
    const colors = {
        'si': 'activity-si',
        't': 'activity-t',
        's': 'activity-s',
        'sg': 'activity-sg',
        'tg': 'activity-tg',
        'h': 'activity-h',
        'o': 'activity-special',
        '*': 'activity-special',
        'B': 'activity-s'
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
        'h': '#d8c27a',   // Muted gold - harvest (rarely used)
        'B': '#9B7EBD',   // Purple - bulbs
        'o': '#A8B5A8',   // Legacy special-handling code
        '*': '#A8B5A8'    // Special handling
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
    return `<span class="activity-badge ${getActivityColor(activity)}">${getDisplayActivityCode(activity)}</span>`;
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
        'Brussels Sprouts': 'brussels',
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

function getPlantReviewTooltip(plant) {
    const confidenceMeta = getPlantReviewConfidenceMeta(plant.name);
    const confidenceLine = confidenceMeta ? `\nConfidence: ${confidenceMeta.label}` : '';

    if (typeof getPlantReviewNote !== 'function') return confidenceLine;

    const reviewNote = getPlantReviewNote(plant.name);
    if (!reviewNote) return confidenceLine;

    return `${confidenceLine}\n\nV2 review note: ${reviewNote}`;
}

function getPlantReviewConfidenceMeta(plantName) {
    if (typeof getPlantReviewConfidence !== 'function') return null;

    const confidence = getPlantReviewConfidence(plantName);
    if (!confidence) return null;

    return {
        value: confidence,
        label: `${confidence.charAt(0).toUpperCase()}${confidence.slice(1)} confidence`
    };
}

function createReviewConfidenceBadge(plantName) {
    const confidenceMeta = getPlantReviewConfidenceMeta(plantName);
    if (!confidenceMeta) return null;

    const badge = document.createElement('span');
    badge.className = `review-confidence-badge review-confidence-${confidenceMeta.value}`;
    badge.setAttribute('aria-label', confidenceMeta.label);
    badge.title = confidenceMeta.label;
    return badge;
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

    const sortedPlants = sortGridPlants(state.filteredPlants);

    sortedPlants.forEach(plant => {
        const row = document.createElement('tr');
        if (plant.type === 'flower') {
            row.classList.add('flower-row');
        }

        // Prepare tooltip data
        const spacingLabel = plant.spacing ? `${plant.spacing} in` : '—';
        const daysLabel = plant.daysToHarvest ? `${plant.daysToHarvest}` : '—';
        const tooltip = `Spacing: ${spacingLabel}\nDays to harvest: ${daysLabel}${getPlantReviewTooltip(plant)}`;

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

        const plantNameRow = document.createElement('span');
        plantNameRow.className = 'plant-name-row';
        plantNameRow.appendChild(plantName);

        const confidenceBadge = createReviewConfidenceBadge(plant.name);
        if (confidenceBadge) {
            plantNameRow.appendChild(confidenceBadge);
        }

        plantNameCell.appendChild(plantNameRow);

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
            const matchesFilter = state.filters.activity === 'all' || monthData.half1.some(activity => normalizeActivityCode(activity) === state.filters.activity);

            if (hasHalf1Activity) {
                const activityDiv = document.createElement('div');
                const isGreenhouse = state.filters.showGreenhouse && monthData.half1.some(a => a === 'sg' || a === 'tg');

                applyActivityCellVisuals(activityDiv, filteredHalf1, {
                    greenhouse: isGreenhouse,
                    filteredOut: !matchesFilter
                });
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
            const matchesFilter2 = state.filters.activity === 'all' || monthData.half2.some(activity => normalizeActivityCode(activity) === state.filters.activity);

            if (hasHalf2Activity) {
                const activityDiv = document.createElement('div');
                const isGreenhouse = state.filters.showGreenhouse && monthData.half2.some(a => a === 'sg' || a === 'tg');

                applyActivityCellVisuals(activityDiv, filteredHalf2, {
                    greenhouse: isGreenhouse,
                    filteredOut: !matchesFilter2
                });
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
                const mainActivity = getPrimaryVisualActivity(monthData.half1);
                if (mainActivity) {
                    half1.classList.add(getActivityColor(mainActivity));
                }
                if (monthData.half1.length === 1 && monthData.half1[0] === 'h') {
                    half1.classList.add('harvest-only');
                }
                renderActivityTokens(half1, monthData.half1, { compact: true });
            }
            monthDiv.appendChild(half1);

            // Half 2
            const half2 = document.createElement('div');
            half2.className = 'timeline-half';
            if (monthData.half2.length > 0) {
                const mainActivity = getPrimaryVisualActivity(monthData.half2);
                if (mainActivity) {
                    half2.classList.add(getActivityColor(mainActivity));
                }
                if (monthData.half2.length === 1 && monthData.half2[0] === 'h') {
                    half2.classList.add('harvest-only');
                }
                renderActivityTokens(half2, monthData.half2, { compact: true });
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
        's': { name: 'Sow Outdoors / Bulbs & Sets', plants: [] },
        't': { name: 'Transplant', plants: [] },
        'tg': { name: 'Transplant Greenhouse', plants: [] },
        '*': { name: 'Special Handling', plants: [] },
        'h': { name: 'Harvest', plants: [] }
    };

    // Collect plants for the specific half-month
    state.filteredPlants.forEach(plant => {
        const monthData = plant.months[monthId];
        const activities = isFirstHalf ? monthData.half1 : monthData.half2;

        activities.forEach(activity => {
            const normalizedActivity = normalizeActivityCode(activity);
            if (activityGroups[normalizedActivity]) {
                // Check if plant already added to this activity group
                if (!activityGroups[normalizedActivity].plants.find(p => p.id === plant.id)) {
                    activityGroups[normalizedActivity].plants.push(plant);
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

        const sortedPlants = sortMonthGroupPlants(group.plants, activityCode, state.currentHalfMonth);

        const section = document.createElement('div');
        section.className = 'month-activity-section';

        const header = document.createElement('h3');
        header.className = 'month-activity-header';
        const displayCode = activityCode === 's' ? 'S/B' : getDisplayActivityCode(activityCode).toUpperCase();
        header.innerHTML = `<span class="legend-badge ${getActivityColor(activityCode)}">${displayCode}</span> ${group.name}`;
        section.appendChild(header);

        const plantsGrid = document.createElement('div');
        plantsGrid.className = 'month-plants-grid';

        sortedPlants.forEach(plant => {
            const card = document.createElement('div');
            card.className = plant.type === 'flower' ? 'month-plant-card flower-card' : 'month-plant-card';
            const edgeState = getMonthViewEdgeState(plant, activityCode, state.currentHalfMonth);

            if (edgeState.startsNow) {
                card.classList.add('month-plant-card--new');
            }

            if (edgeState.endsNow) {
                card.classList.add('month-plant-card--ending');
            }

            const reviewTooltip = getPlantReviewTooltip(plant).trim();
            if (reviewTooltip) {
                card.dataset.tooltip = reviewTooltip;
                card.title = reviewTooltip;
            }

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

            const titleRow = document.createElement('div');
            titleRow.className = 'month-plant-title-row';
            titleRow.appendChild(nameEl);

            const confidenceBadge = createReviewConfidenceBadge(plant.name);
            if (confidenceBadge) {
                titleRow.appendChild(confidenceBadge);
            }

            if (isDeerFriendlyFlower(plant)) {
                const deerBadge = document.createElement('span');
                deerBadge.className = 'month-plant-deer-badge';
                deerBadge.textContent = '🦌';
                deerBadge.title = 'Deer friendly flower';
                deerBadge.setAttribute('aria-label', 'Deer friendly flower');
                titleRow.appendChild(deerBadge);
            }

            infoContainer.appendChild(titleRow);

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
const filterControls = document.querySelector('.filter-controls');

function isMobileSearchViewport() {
    return window.matchMedia('(max-width: 768px)').matches;
}

function setSearchExpanded(expanded, { focusInput = false } = {}) {
    if (!searchToggle || !filterControls || !elements.searchInput) return;

    const isExpanded = expanded && isMobileSearchViewport();
    filterControls.classList.toggle('search-expanded', isExpanded);
    searchToggle.setAttribute('aria-expanded', String(isExpanded));
    searchToggle.setAttribute('aria-label', isExpanded ? 'Close search' : 'Open search');
    searchToggle.textContent = isExpanded ? '✕' : '🔍';

    if (focusInput && isExpanded) {
        elements.searchInput.focus();
    }
}

if (searchToggle && filterControls && elements.searchInput) {
    setSearchExpanded(false);

    searchToggle.addEventListener('click', () => {
        const isExpanded = filterControls.classList.contains('search-expanded');
        setSearchExpanded(!isExpanded, { focusInput: !isExpanded });

        if (isExpanded) {
            searchToggle.focus();
        }
    });

    elements.searchInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;

        setSearchExpanded(false);
        searchToggle.focus();
    });

    filterControls.addEventListener('focusout', () => {
        if (!isMobileSearchViewport()) return;

        requestAnimationFrame(() => {
            if (document.activeElement && filterControls.contains(document.activeElement)) return;
            if (elements.searchInput.value.trim()) return;
            setSearchExpanded(false);
        });
    });

    window.addEventListener('resize', () => {
        if (isMobileSearchViewport()) return;
        setSearchExpanded(false);
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

function initApp() {
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
    initDatasetSwitch();
    updateGreenhouseFilterVisibility();
    filterPlants();
    applyNowEmphasisToGrid();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
    initApp();
}
