# Piedmont Planner - Zone 8a Planting Calendar

**🌱 [View Live Site](https://jyvisuals.github.io/Piedmont-Planner/)**

A beautiful, interactive planting calendar for Zone 8a gardeners in the Piedmont region. This website helps you track when to sow, transplant, and harvest vegetables and flowers throughout the year.

## Features

- **Multiple View Modes**
  - **Grid View**: Traditional spreadsheet-style table with all plants and months
  - **Month View**: Month-by-month breakdown of planting activities

- **Plant Detail Panel**
  - Click a plant name to open a slide-in panel with spacing, days-to-harvest, and guide notes (varieties + tips when available)

- **Powerful Filtering**
  - Search plants by name
  - Toggle flower visibility
  - Filter by activity type (sow indoors, transplant, sow outdoors, etc.)
  - Filter by specific month

- **Responsive Design**
  - Mobile-friendly interface
  - Print-friendly styles
  - Garden-themed color palette

- **Remembers Your Preferences**
  - View mode, search text, flower/greenhouse toggles, and the active activity filter are saved to `localStorage` and restored on your next visit

- **Installable & Offline-Ready (PWA)**
  - Add to your home screen and use the calendar in the garden without a connection
  - A service worker caches the app shell and assets after first load

- **75+ Plants Included**
  - Vegetables, herbs, and flowers
  - Planting spacing information
  - Days to harvest data
  - Month-by-month planting guide split into half-months
  - Timings reviewed against the NC State Central NC planting calendar and other Piedmont-oriented sources, with per-plant confidence ratings and evidence links

## Activity Legend

- **si** - Sow Indoors
- **t** - Transplant
- **s** - Sow Outdoors
- **sg** - Sow Greenhouse (unheated)
- **tg** - Transplant Greenhouse (unheated)
- **h** - Harvest
- **\*** - Special handling (e.g. heat-managed germination, overwinter prep)
- **B** - Bulbs, cloves, or sets

## Local Usage

1. Clone or download this repository
2. Open `index.html` in a web browser
3. No build process or server required!

## Deployment

This site is deployed using GitHub Pages with GitHub Actions. The deployment workflow automatically publishes changes when pushed to the `main` branch.

**Live Site**: [https://jyvisuals.github.io/Piedmont-Planner/](https://jyvisuals.github.io/Piedmont-Planner/)

### Making Updates

To deploy changes:
```bash
git add .
git commit -m "Your commit message"
git push
```

The site will automatically rebuild and deploy within 1-2 minutes.

## File Structure

```
Piedmont-Planner/
├── index.html               # Main HTML structure
├── styles.css               # Styling and responsive design
├── script.js                # Interactive functionality (+ preference persistence)
├── data.js                  # Plant calendar data, guide notes, and review metadata
├── carrboro_plant_guide.csv # Source guide data (varieties + tips)
├── manifest.webmanifest     # PWA manifest (install metadata)
├── service-worker.js        # Offline caching
├── favicon.svg              # Vector favicon (leaf mark)
├── og-image.png             # Social share image (1200×630)
├── icons/                   # Plant icons + generated app/favicon PNGs
├── scripts/                 # CI validation + icon generator
└── README.md                # This file
```

## Customization

### Adding New Plants

Edit `data.js` and add a new plant object to the `PLANTS` array:

```javascript
{
  id: 66,
  name: "Your Plant Name",
  type: "vegetable", // or "flower"
  spacing: "12",
  daysToHarvest: "60-70",
  months: {
    jan: { half1: [], half2: [] },
    feb: { half1: ["si"], half2: ["si"] },
    // ... continue for all 12 months
  }
}
```

### Changing Color Theme

Edit the CSS variables in `styles.css`:

```css
:root {
  --primary-green: #2d5016;
  --secondary-green: #4a7c2f;
  /* ... modify other colors as needed */
}
```

### Modifying Activity Colors

Update the activity color variables in `styles.css`:

```css
:root {
  --color-si: #6a89cc;  /* Sow Indoors */
  --color-t: #e77f67;   /* Transplant */
  /* ... etc */
}
```

### Regenerating Icons & Social Image

The favicon PNGs, PWA icons, and `og-image.png` are committed artifacts generated
from a single leaf mark (no build step at deploy time). After editing the brand
colors or shape in `scripts/generate-icons.mjs`, regenerate them with:

```bash
node scripts/generate-icons.mjs
```

## Browser Compatibility

Works on all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Technologies Used

- HTML5
- CSS3 (Grid, Flexbox)
- Vanilla JavaScript (ES6+)
- No external dependencies or frameworks

## Credits

Calendar data compiled for USDA Zone 8a growing conditions.

## License

Feel free to use, modify, and distribute this project for personal or educational purposes.

## Contributing

Found an error in the planting data? Want to add more plants? Feel free to:
1. Fork the repository
2. Make your changes
3. Submit a pull request

## Support

For issues or questions, please open an issue on the GitHub repository.

---

Happy Gardening! 🌱
