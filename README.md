# Appointment Dashboard

A modern, interactive dashboard for visualizing appointment data with React, Recharts, and Tailwind CSS.

## Features

- **Interactive Charts**: Bar charts, pie charts, and line charts for different data views
- **Data Filtering**: Filter appointments by source type
- **Responsive Design**: Mobile-friendly layout with Tailwind CSS
- **CSV Data Support**: Processes CSV files with Greek column headers
- **Sample Data**: Includes sample data for demonstration when CSV is not available

## Technologies Used

- React 18
- Recharts for data visualization
- Tailwind CSS for styling
- Lucide React for icons
- Papa Parse for CSV processing
- Vite for build tooling

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Chart Types

1. **Appointments by User**: Bar chart showing appointment counts per user
2. **Appointments by Source**: Pie chart showing distribution by source type
3. **Appointments Over Time**: Line chart showing appointments timeline
4. **Appointments by Store**: Bar chart showing appointments per store location

## Data Format

The application expects CSV data with the following Greek column headers:
- `Χρήστης δημιουργίας` (User)
- `Source Type` (Source Type)
- `Υποκατάστημα` (Store/Branch)
- `Ημερομηνία/Ωρα Εναρξης` (Start Date/Time)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── App.jsx          # Main application component
├── main.jsx         # React entry point
└── index.css        # Global styles with Tailwind

public/              # Static assets
├── index.html       # HTML template
```

## Customization

- **Colors**: Modify the `COLORS` array in `App.jsx` to change chart colors
- **Styling**: Update Tailwind classes or add custom CSS
- **Data Processing**: Modify the `processData` function to handle different data formats
- **Charts**: Add new chart types by extending the `renderChart` function

## License

MIT License
