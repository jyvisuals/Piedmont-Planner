# Zone 8a Planting Calendar

A beautiful, interactive planting calendar for Zone 8a gardeners. This website helps you track when to sow, transplant, and harvest vegetables and flowers throughout the year.

## Features

- **Multiple View Modes**
  - **Grid View**: Traditional spreadsheet-style table with all plants and months
  - **Month View**: Month-by-month breakdown of planting activities

- **Powerful Filtering**
  - Search plants by name
  - Toggle flower visibility
  - Filter by activity type (sow indoors, transplant, sow outdoors, etc.)
  - Filter by specific month

- **Responsive Design**
  - Mobile-friendly interface
  - Print-friendly styles
  - Garden-themed color palette

- **65+ Plants Included**
  - Vegetables, herbs, and flowers
  - Planting spacing information
  - Days to harvest data
  - Month-by-month planting guide split into half-months

## Activity Legend

- **si** - Sow Indoors
- **t** - Transplant
- **s** - Sow Outdoors
- **sg** - Sow Greenhouse
- **tg** - Transplant Greenhouse
- **h** - Harvest
- **o** - Other
- **B** - Bulb Planting

**Note**: Plants marked with ** should start seeds indoors for later transplant. Do not plant seeds directly in the garden.

## Local Usage

1. Clone or download this repository
2. Open `index.html` in a web browser
3. No build process or server required!

## Deploying to GitHub Pages

### Option 1: Using GitHub Web Interface

1. Create a new repository on GitHub
2. Upload all files (`index.html`, `styles.css`, `script.js`, `data.js`, `README.md`)
3. Go to repository Settings > Pages
4. Under "Source", select "main" branch
5. Click Save
6. Your site will be published at `https://yourusername.github.io/gardenmap/`

### Option 2: Using Git Command Line

```bash
# Initialize git repository
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Zone 8a Planting Calendar"

# Add remote (replace with your repository URL)
git remote add origin https://github.com/yourusername/gardenmap.git

# Push to GitHub
git branch -M main
git push -u origin main
```

Then enable GitHub Pages in your repository settings as described in Option 1.

## File Structure

```
gardenmap/
├── index.html          # Main HTML structure
├── styles.css          # Styling and responsive design
├── script.js           # Interactive functionality
├── data.js             # Plant calendar data
└── README.md           # This file
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
