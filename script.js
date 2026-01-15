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
        'Moonflower': 'moonflower',
        'Sunflower': 'sunflower',
        'Calendula': 'calendula.png',
        'Snapdragons': 'snapdragon.png'
    };

    // Emoji icons for flowers without SVG/PNG
    const emojiFlowers = {
        'Zinnias': '🌺',          // Bright hibiscus-like flower
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
            card.className = plant.type === 'flower' ? 'month-plant-card flower-card' : 'month-plant-card';

            const iconData = plant.type === 'flower' ? getFlowerIcon(plant.name) : getPlantIcon(plant.name);

            const header = document.createElement('h4');

            if (iconData.type === 'svg') {
                const img = document.createElement('img');
                img.src = iconData.path;
                img.alt = plant.name;
                img.className = 'month-plant-icon-svg';
                img.style.width = '20px';
                img.style.height = '20px';
                img.style.marginRight = '6px';
                img.style.verticalAlign = 'middle';
                header.appendChild(img);
                header.appendChild(document.createTextNode(plant.name));
            } else {
                header.textContent = iconData.icon + ' ' + plant.name;
            }

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
        showGreenhouse: true,
        activity: 'all'
    };

    elements.searchInput.value = '';
    elements.showFlowersCheckbox.checked = true;
    elements.showGreenhouseCheckbox.checked = true;

    // Reset legend active state
    document.querySelectorAll('.legend-item').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.legend-item[data-activity="all"]').classList.add('active');

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
            document.querySelector('.legend-item[data-activity="all"]').classList.add('active');
        }

        updateGreenhouseFilterVisibility();
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
    updateGreenhouseFilterVisibility();
    filterPlants();
    applyNowEmphasisToGrid();
});
