import React, { useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  TrendingUp as LineChartIcon,
  Store as StoreIcon,
  Upload as UploadIcon,
  Calendar as CalendarIcon,
  Filter as FilterIcon,
  Users as UsersIcon
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Custom component for a chart card with a title and a container for the chart
const ChartCard = ({ title, children }) => (
  <div className="bg-white rounded-xl shadow-xl p-6 transition-all duration-300 hover:shadow-2xl h-80">
    <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">{title}</h2>
    {children}
  </div>
);

// Define a consistent set of colors for the pie chart and other elements
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A368F1', '#E74C3C', '#2ECC71'];

// Helper function to parse Greek date format (DD/MM/YYYY or D/M/YYYY)
const parseGreekDate = (dateField) => {
  if (!dateField) return null;
  
  try {
    // Handle different date formats
    let dateStr = dateField;
    if (typeof dateStr === 'string') {
      dateStr = dateStr.split(' ')[0]; // Remove time part if present
      dateStr = dateStr.trim(); // Remove any whitespace
    }
    
    // Handle Excel date numbers (since 1900)
    if (typeof dateField === 'number') {
      console.log('📅 Excel number date detected:', dateField);
      // Excel dates are days since January 1, 1900 (with some quirks)
      // Handle both 1900 and 1904 date systems
      const excelEpoch = new Date(1900, 0, 1);
      let daysSinceEpoch = dateField - 1; // Adjust for Excel's day counting
      
      // Handle Excel's leap year bug (1900 was not a leap year but Excel treats it as one)
      if (dateField > 59) {
        daysSinceEpoch = dateField - 2;
      }
      
      const date = new Date(excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000);
      console.log('📅 Converted Excel date:', dateField, '->', date, 'formatted:', formatDateForChart(date));
      return date;
    }
    
    // Try parsing as DD/MM/YYYY or D/M/YYYY format first
    const dateParts = String(dateStr).split('/');
    if (dateParts.length === 3) {
      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // JavaScript months are 0-indexed
      const year = parseInt(dateParts[2]);
      
      // Validate the parsed values
      if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900 && year <= 2100) {
        const parsedDate = new Date(year, month, day);
        // Double check that the date is valid
        if (parsedDate.getDate() === day && parsedDate.getMonth() === month && parsedDate.getFullYear() === year) {
          return parsedDate;
        }
      }
    }
    
    // Try parsing with dashes (DD-MM-YYYY)
    const dashParts = String(dateStr).split('-');
    if (dashParts.length === 3) {
      const day = parseInt(dashParts[0]);
      const month = parseInt(dashParts[1]) - 1;
      const year = parseInt(dashParts[2]);
      
      if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900 && year <= 2100) {
        const parsedDate = new Date(year, month, day);
        if (parsedDate.getDate() === day && parsedDate.getMonth() === month && parsedDate.getFullYear() === year) {
          return parsedDate;
        }
      }
    }
    
    // Try parsing with dots (DD.MM.YYYY)
    const dotParts = String(dateStr).split('.');
    if (dotParts.length === 3) {
      const day = parseInt(dotParts[0]);
      const month = parseInt(dotParts[1]) - 1;
      const year = parseInt(dotParts[2]);
      
      if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900 && year <= 2100) {
        const parsedDate = new Date(year, month, day);
        if (parsedDate.getDate() === day && parsedDate.getMonth() === month && parsedDate.getFullYear() === year) {
          return parsedDate;
        }
      }
    }
    
    // Fallback to standard Date parsing
    const fallbackDate = new Date(dateStr);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate;
    }
    
    return null;
  } catch (e) {
    console.warn('Date parsing error for:', dateField, e);
    return null;
  }
};

// Helper function to format date for display
const formatDateForChart = (date) => {
  if (!date) return 'Unknown Date';
  
  // Format as DD/MM/YYYY for consistency
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

const App = () => {
  // State variables for the application
  const [rawData, setRawData] = useState([]);
  const [processedData, setProcessedData] = useState({
    appointmentsByUser: [],
    appointmentsBySource: [],
    appointmentsOverTime: [],
    appointmentsByStore: [],
  });
  const [selectedSource, setSelectedSource] = useState(null);
  const [uniqueSources, setUniqueSources] = useState([]);
  const [activeChart, setActiveChart] = useState('appointmentsByUser');
  const [loading, setLoading] = useState(true);
  
  // New state for enhanced filtering
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showCallCenterOnly, setShowCallCenterOnly] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [uniqueUsers, setUniqueUsers] = useState([]);
  
  // New state for user inclusion control
  const [includedUsers, setIncludedUsers] = useState(new Set());
  const [showUserManagement, setShowUserManagement] = useState(false);
  
  // File input ref
  const fileInputRef = useRef(null);
  
  // Helper functions for user management
  const toggleUserInclusion = (user) => {
    const newIncludedUsers = new Set(includedUsers);
    if (newIncludedUsers.has(user)) {
      newIncludedUsers.delete(user);
    } else {
      newIncludedUsers.add(user);
    }
    setIncludedUsers(newIncludedUsers);
  };
  
  const includeAllUsers = () => {
    setIncludedUsers(new Set(uniqueUsers));
  };
  
  const excludeAllUsers = () => {
    setIncludedUsers(new Set());
  };

  // Function to process the raw CSV data into a usable format for the charts
  const processData = (data, filterSource, dateStart, dateEnd, callCenterOnly, selectedUserFilter, includedUsersSet) => {
    console.log('🔍 Processing data with filters:', { filterSource, dateStart, dateEnd, callCenterOnly, selectedUserFilter, includedUsersCount: includedUsersSet?.size || 0 });
    console.log('📊 Raw data sample:', data.slice(0, 2));
    
    // Filter data based on selected criteria
    let filteredData = data;
    
    // Helper function to find field value using multiple patterns, robust to spaces/case
    const findFieldValue = (row, patterns) => {
      for (let pattern of patterns) {
        const patternNorm = pattern.replace(/\s+/g, '').toLowerCase();
        for (let key of Object.keys(row)) {
          const keyNorm = (key || '').replace(/\s+/g, '').toLowerCase();
          if (keyNorm.includes(patternNorm) || patternNorm.includes(keyNorm)) {
            // Return trimmed value if string
            const val = row[key];
            return typeof val === 'string' ? val.trim() : val;
          }
        }
      }
      return '';
    };
    
    // Filter by source type
    if (filterSource) {
      filteredData = filteredData.filter(row => {
        const source = findFieldValue(row, ['Source Type', 'Source_Type', 'SourceType', 'Source', 'Type', 'Πηγή', 'source', 'πηγή']);
        return source === filterSource;
      });
    }
    
    // Filter by specific user
    if (selectedUserFilter) {
      filteredData = filteredData.filter(row => {
        const user = findFieldValue(row, ['Χρήστης δημιουργίας', 'Χρήστης_δημιουργίας', 'Χρήστης δημιουργίας', 'User', 'user', 'Χρήστης', 'created by', 'creator']);
        return user === selectedUserFilter;
      });
    }
    
    // Filter by date range
    if (dateStart || dateEnd) {
      filteredData = filteredData.filter(row => {
        const dateField = findFieldValue(row, ['Ημερομηνία δημιουργίας', 'Ημερομηνία_δημιουργίας', 'Ημερομηνία δημιουργίας', 'Date', 'date', 'Ημ/νία δημιουργίας', 'Ημερομηνία', 'ημερομηνία', 'Ημέρα']);
        if (!dateField) return false;
        
        const rowDate = parseGreekDate(dateField);
        if (!rowDate) return false; // Skip invalid dates
        
        // Set time to start of day for proper comparison
        const startOfDay = new Date(rowDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        if (dateStart) {
          const startComparison = new Date(dateStart);
          startComparison.setHours(0, 0, 0, 0);
          if (startOfDay < startComparison) return false;
        }
        if (dateEnd) {
          const endComparison = new Date(dateEnd);
          endComparison.setHours(23, 59, 59, 999);
          if (startOfDay > endComparison) return false;
        }
        return true;
      });
    }
    
    // Filter for Call Center users only - improved detection
    if (callCenterOnly) {
      filteredData = filteredData.filter(row => {
        const user = findFieldValue(row, ['Χρήστης δημιουργίας', 'Χρήστης_δημιουργίας', 'Χρήστης δημιουργίας', 'User', 'user', 'Χρήστης', 'created by', 'creator']);
        const userLower = user.toLowerCase();
        // Check for various Call Center patterns
        return userLower.includes('call_center') || 
               userLower.includes('callcenter') || 
               userLower.includes('call center') ||
               userLower.includes('cc_') ||
               userLower.startsWith('cc') ||
               userLower.includes('κέντρο') || // Greek for center
               userLower.includes('kentro');
      });
    }

    // Aggregates for each chart type
    const appointmentsByUser = {};
    const appointmentsBySource = {};
    const appointmentsOverTime = {};
    const appointmentsByStore = {};

    let firstDebug = true;
    filteredData.forEach(row => {
      // Data extraction from the CSV columns using flexible column name matching
      const findField = (patterns) => {
        for (let pattern of patterns) {
          const patternNorm = pattern.replace(/\s+/g, '').toLowerCase();
          for (let key of Object.keys(row)) {
            const keyNorm = (key || '').replace(/\s+/g, '').toLowerCase();
            if (keyNorm.includes(patternNorm) || patternNorm.includes(keyNorm)) {
              const val = row[key];
              return typeof val === 'string' ? val.trim() : val;
            }
          }
        }
        return '';
      };

      const user = findField(['Χρήστης δημιουργίας', 'Χρήστης_δημιουργίας', 'Χρήστης δημιουργίας', 'User', 'user', 'Χρήστης', 'created by', 'creator']);
      const source = findField(['Source Type', 'Source_Type', 'SourceType', 'Source', 'Type', 'Πηγή', 'source', 'πηγή']);
      const store = findField(['Υποκατάστημα', 'Υποκατάστημα', 'Store', 'Branch', 'Κατάστημα', 'Shop', 'Location', 'store', 'κατάστημα']);

      // Debug log for first row
      if (firstDebug) {
        console.log('🔎 Parsed row:', { user, source, store, row });
        firstDebug = false;
      }

      // Skip this row if user is not included in the report (unless no users are specifically included)
      if (includedUsersSet && includedUsersSet.size > 0 && user && !includedUsersSet.has(user)) {
        return; // Skip this row
      }

      // Extract the date part and format it for consistent charting
      let date = 'Unknown Date';
      const dateField = findField([
        'Ημερομηνία δημιουργίας', 'Ημερομηνία_δημιουργίας', 'Ημερομηνία δημιουργίας',
        'Date', 'date', 'Ημ/νία δημιουργίας', 'Ημερομηνία', 'ημερομηνία', 'Ημέρα',
        'Ημερομηνία/Ωρα Εναρξης', 'Ημερομηνία/Ώρα Έναρξης', 'Start Date', 'Start Time'
      ]);

      // Remove time if present (e.g., '4/6/2025 10:30:00 πμ')
      let dateOnly = dateField;
      if (typeof dateField === 'string' && dateField.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
        dateOnly = dateField.split(' ')[0];
      }

      if (dateOnly) {
        const parsedDate = parseGreekDate(dateOnly);
        if (parsedDate) {
          date = formatDateForChart(parsedDate);
          //console.log('✅ Date parsed successfully:', dateField, '->', date, 'timestamp:', parsedDate.getTime());
        } else {
          //console.log('❌ Date parsing failed for:', dateField);
        }
      } else {
        //console.log('⚠️ No date field found in row:', Object.keys(row));
      }

      // Update counts for each chart based on the data
      if (user) appointmentsByUser[user] = (appointmentsByUser[user] || 0) + 1;
      if (source) appointmentsBySource[source] = (appointmentsBySource[source] || 0) + 1;
      if (date && date !== 'Unknown Date') {
        // Use the already formatted date as the key for consistency
        appointmentsOverTime[date] = (appointmentsOverTime[date] || 0) + 1;
      }
      if (store) appointmentsByStore[store] = (appointmentsByStore[store] || 0) + 1;
    });

    // Convert aggregated data into arrays of objects for Recharts
    const chartData = {
      appointmentsByUser: Object.keys(appointmentsByUser).map(key => ({
        user: key,
        appointments: appointmentsByUser[key],
      })),
      appointmentsBySource: Object.keys(appointmentsBySource).map(key => ({
        name: key,
        value: appointmentsBySource[key],
      })),
      appointmentsOverTime: Object.keys(appointmentsOverTime)
        .map(key => {
          const parsedDate = parseGreekDate(key);
          return { 
            date: key, 
            appointments: appointmentsOverTime[key],
            sortDate: parsedDate ? parsedDate.getTime() : 0, // Use timestamp for reliable sorting
            displayDate: parsedDate ? formatDateForChart(parsedDate) : key // Ensure consistent display format
          };
        })
        .sort((a, b) => a.sortDate - b.sortDate) // Sort by timestamp
        .map(item => ({ 
          date: item.displayDate, // Use formatted date for display
          appointments: item.appointments 
        })),
      appointmentsByStore: Object.keys(appointmentsByStore).map(key => ({
        store: key,
        appointments: appointmentsByStore[key],
      })),
    };

    console.log('📈 Final processed chart data:');
    console.log('- appointmentsByUser:', chartData.appointmentsByUser.length, 'entries');
    console.log('- appointmentsBySource:', chartData.appointmentsBySource.length, 'entries');
    console.log('- appointmentsOverTime:', chartData.appointmentsOverTime.length, 'entries');
    if (chartData.appointmentsOverTime.length > 0) {
      console.log('- appointmentsOverTime sample:', chartData.appointmentsOverTime.slice(0, 5));
      console.log('- appointmentsOverTime date range:', 
        chartData.appointmentsOverTime[0]?.date, 'to', 
        chartData.appointmentsOverTime[chartData.appointmentsOverTime.length - 1]?.date
      );
    }
    console.log('- appointmentsByStore:', chartData.appointmentsByStore.length, 'entries');

    return chartData;
  };

  // Generate sample data for demonstration
  const generateSampleData = () => {
    const sampleData = [
      {
        'Χρήστης δημιουργίας': 'k_tsipasis',
        'Υποκατάστημα': 'ΒΟΤΑΝΙΚΟΣ-ΣΤΡΥΜΟΝΟΣ 2 MOTO',
        'Ημερομηνία δημιουργίας': '01/08/2025',
        'Source Type': 'SP4'
      },
      {
        'Χρήστης δημιουργίας': 's_sarellis',
        'Υποκατάστημα': 'ΒΟΛΟΣ ΒΟΛΟΣ- Λ.ΔΙΟΜ/ΝΙΚΗ ΖΩΝΗ',
        'Ημερομηνία δημιουργίας': '01/08/2025',
        'Source Type': 'SP4'
      },
      {
        'Χρήστης δημιουργίας': 'l_lianakis',
        'Υποκατάστημα': 'ΜΑΡΟΥΣΙ - ΚΗΦΙΣΙΑΣ 55 & ΑΜΑΡ. ΑΡΤΕΜΙΔΟΣ 1',
        'Ημερομηνία δημιουργίας': '02/08/2025',
        'Source Type': 'SP4'
      },
      {
        'Χρήστης δημιουργίας': 'e_davradi',
        'Υποκατάστημα': 'ΓΛΥΚΑ ΝΕΡΑ- Λ.ΛΑΥΡΙΟΥ 81',
        'Ημερομηνία δημιουργίας': '03/08/2025',
        'Source Type': 'SP4'
      },
      {
        'Χρήστης δημιουργίας': 's_stamopoulos',
        'Υποκατάστημα': 'ΓΛΥΚΑ ΝΕΡΑ- Λ.ΛΑΥΡΙΟΥ 81',
        'Ημερομηνία δημιουργίας': '04/08/2025',
        'Source Type': 'SP4'
      },
      {
        'Χρήστης δημιουργίας': 'm_tsirigaki',
        'Υποκατάστημα': 'ΠΕΡΙΣΤΕΡΙ - Λ. ΚΗΦΙΣΟΥ 36',
        'Ημερομηνία δημιουργίας': '05/08/2025',
        'Source Type': 'SP4'
      },
      {
        'Χρήστης δημιουργίας': 's_kouvari',
        'Υποκατάστημα': 'ΜΑΡΟΥΣΙ - ΚΗΦΙΣΙΑΣ 55 & ΑΜΑΡ. ΑΡΤΕΜΙΔΟΣ 1',
        'Ημερομηνία δημιουργίας': '05/08/2025',
        'Source Type': 'SP4'
      },
      {
        'Χρήστης δημιουργίας': 'call_center_agent1',
        'Υποκατάστημα': 'ΒΟΤΑΝΙΚΟΣ-ΣΤΡΥΜΟΝΟΣ 2 MOTO',
        'Ημερομηνία δημιουργίας': '06/08/2025',
        'Source Type': 'OnlineOSB'
      }
    ];

    setRawData(sampleData);
    setUniqueSources([...new Set(sampleData.map(row => row['Source Type']).filter(Boolean))]);
    setUniqueUsers([...new Set(sampleData.map(row => row['Χρήστης δημιουργίας']).filter(Boolean))]);
    setUploadedFileName('Sample Data');
    setLoading(false);
  };

  // Handle file upload (Excel or CSV)
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
    setLoading(true);
    setUploadedFileName(file.name);
    
    const reader = new FileReader();
    
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      alert('Error reading file. Please try again.');
      setLoading(false);
    };
    
    reader.onload = (e) => {
      try {
        console.log('File loaded, processing...');
        const data = e.target.result;
        let parsedData = [];

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          console.log('Processing Excel file...');
          // Handle Excel files
          const workbook = XLSX.read(data, { type: 'binary' });
          console.log('Workbook sheets:', workbook.SheetNames);
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          parsedData = XLSX.utils.sheet_to_json(worksheet);
          console.log('Parsed data length:', parsedData.length);
          console.log('First row sample:', parsedData[0]);
        } else if (file.name.endsWith('.csv')) {
          console.log('Processing CSV file...');
          // Handle CSV files
          Papa.parse(data, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              parsedData = results.data;
              console.log('CSV parsed data length:', parsedData.length);
              console.log('First row sample:', parsedData[0]);
            }
          });
        }

        console.log('Raw parsed data:', parsedData.slice(0, 3)); // Show first 3 rows
        
        // Show all available columns for debugging
        if (parsedData.length > 0) {
          console.log('📋 Available columns in Excel file:', Object.keys(parsedData[0]));
          console.log('📋 First row data structure:', parsedData[0]);
        }

        // Filter out any rows that are missing key data for appointments
        const validData = parsedData.filter(row => {
          const hasDate = row['Ημερομηνία δημιουργίας'] || row['Ημερομηνία_δημιουργίας'] || row['Ημερομηνία δημιουργίας'] || 
                         row['Date'] || row['date'] || row['Ημ/νία δημιουργίας'] || row['Ημερομηνία'];
          const hasUser = row['Χρήστης δημιουργίας'] || row['Χρήστης_δημιουργίας'] || row['Χρήστης δημιουργίας'] || 
                         row['User'] || row['user'] || row['Χρήστης'];
          
          console.log('🔍 Row validation:', { 
            hasDate, 
            hasUser, 
            dateFields: [row['Ημερομηνία δημιουργίας'], row['Ημερομηνία_δημιουργίας'], row['Date']], 
            userFields: [row['Χρήστης δημιουργίας'], row['Χρήστης_δημιουργίας'], row['User']]
          });
          
          return hasDate && hasUser;
        });
        
        console.log('Valid data after filtering:', validData.length);
        console.log('Valid data sample:', validData.slice(0, 2));
        
        // Extract unique sources with flexible column name matching
        const sources = validData.map(row => 
          row['Source Type'] || row['Source_Type'] || row['SourceType'] || row['Source'] || row['Type'] || ''
        ).filter(Boolean);
        
        // Extract unique users with flexible column name matching
        const users = validData.map(row =>
          row['Χρήστης δημιουργίας'] || row['Χρήστης_δημιουργίας'] || row['Χρήστης δημιουργίας'] || 
          row['User'] || row['user'] || row['Χρήστης'] || ''
        ).filter(Boolean);
        
        console.log('Unique sources found:', [...new Set(sources)]);
        console.log('Unique users found:', [...new Set(users)]);
        
        setRawData(validData);
        setUniqueSources([...new Set(sources)]);
        setUniqueUsers([...new Set(users)]);
        setLoading(false);
        
        if (validData.length === 0) {
          alert('No valid data found. Please check that your Excel file has the required columns: Χρήστης δημιουργίας, Υποκατάστημα, Ημερομηνία δημιουργίας, Source Type');
        }
      } catch (error) {
        console.error('Error parsing file:', error);
        alert(`Error parsing file: ${error.message}. Please check the file format and try again.`);
        setLoading(false);
      }
    };

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  };

  // Fetch the CSV data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Try to fetch the CSV file, but fall back to sample data if not available
        const response = await fetch('uploaded:Ραντεβού_ανά_ημέρα_Εταιρείας_8.xlsx_-_Sheet.csv-2612711d-2856-4c4f-96a9-807d9d280e55');
        
        if (!response.ok) {
          console.log('CSV file not found, using sample data');
          generateSampleData();
          return;
        }
        
        const text = await response.text();
        
        // Use Papa Parse to convert CSV text into a JSON-like array of objects
        Papa.parse(text, {
          header: true, // Treat the first row as headers
          skipEmptyLines: true,
          complete: (results) => {
            // Filter out any rows that are missing key data for appointments
            const validData = results.data.filter(row => row['Ημερομηνία δημιουργίας'] && row['Χρήστης δημιουργίας']);
            setRawData(validData);
            // Get unique source types for the filter dropdown
            setUniqueSources([...new Set(validData.map(row => row['Source Type']).filter(Boolean))]);
            setLoading(false);
          },
        });
      } catch (error) {
        console.error("Failed to fetch or parse CSV:", error);
        console.log('Using sample data instead');
        generateSampleData();
      }
    };
    fetchData();
  }, []);

  // Process data whenever raw data or any filter changes
  useEffect(() => {
    if (rawData.length > 0) {
      const newProcessedData = processData(rawData, selectedSource, startDate, endDate, showCallCenterOnly, selectedUser, includedUsers);
      setProcessedData(newProcessedData);
    }
  }, [rawData, selectedSource, startDate, endDate, showCallCenterOnly, selectedUser, includedUsers]);

  // Render the appropriate chart based on the activeChart state
  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center w-full h-80">
          <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
        </div>
      );
    }

    // Check if there is data to display; if not, show a message
    if (!processedData || Object.values(processedData).every(d => !d || d.length === 0)) {
        console.log('⚠️ No data available for display:', processedData);
        return (
          <div className="flex items-center justify-center w-full h-80">
            <p className="text-gray-500 text-lg">No data available for the selected filter.</p>
          </div>
        );
    }

    switch (activeChart) {
      case 'appointmentsByUser':
        return (
          <ChartCard title="Appointments by User">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedData.appointmentsByUser} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="user" tick={false} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="appointments" fill="#8884d8" name="Number of Appointments" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        );
      case 'appointmentsBySource':
        // Clean and group pie data for better UI
        let pieData = processedData.appointmentsBySource
          .map(d => ({
            name: (d.name || '').trim() || 'Unknown',
            value: d.value || 0
          }))
          .filter(d => d.name && d.name !== 'Unknown' && d.value > 0);

        // If too many unique types, group smallest into 'Other'
        const MAX_SLICES = 7;
        if (pieData.length > MAX_SLICES) {
          // Sort descending
          pieData = pieData.sort((a, b) => b.value - a.value);
          const mainSlices = pieData.slice(0, MAX_SLICES - 1);
          const otherValue = pieData.slice(MAX_SLICES - 1).reduce((sum, d) => sum + d.value, 0);
          pieData = [
            ...mainSlices,
            { name: 'Other', value: otherValue }
          ];
        }

        // Custom label to show percentage and name, outside for small slices
        const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
          const RADIAN = Math.PI / 180;
          const radius = innerRadius + (outerRadius - innerRadius) * 1.05;
          const x = cx + radius * Math.cos(-midAngle * RADIAN);
          const y = cy + radius * Math.sin(-midAngle * RADIAN);
          // Show label outside for small slices, inside for large
          const showOutside = percent < 0.08;
          return (
            <text
              x={x}
              y={y}
              fill="#333"
              textAnchor={x > cx ? 'start' : 'end'}
              dominantBaseline="central"
              fontSize={14}
              fontWeight={600}
            >
              {percent > 0 ? `${name}: ${(percent * 100).toFixed(1)}% (${value})` : ''}
            </text>
          );
        };
        return (
          <ChartCard title="Appointments by Source">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  minAngle={5}
                  label={renderCustomizedLabel}
                  labelLine={false}
                  nameKey="name"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, 'Appointments']} />
                <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        );
      case 'appointmentsOverTime':
        // Log the data for debugging
        console.log('📈 Appointments Over Time data:', processedData.appointmentsOverTime);
        return (
          <ChartCard title="Appointments Over Time">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processedData.appointmentsOverTime} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => `Date: ${value}`}
                  formatter={(value) => [value, 'Appointments']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="appointments" 
                  stroke="#82ca9d" 
                  name="Number of Appointments" 
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        );
      case 'appointmentsByStore':
        return (
          <ChartCard title="Appointments by Store">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedData.appointmentsByStore} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="store" tick={false} />
                <YAxis />
                <Tooltip />
                {/* Legend removed to avoid showing store names under the chart */}
                <Bar dataKey="appointments" fill="#FFBB28" name="Number of Appointments" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        );
      default:
        return null;
    }
  };

  // Helper function to dynamically apply button styles
  const buttonClass = (chartName) =>
    `flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
      activeChart === chartName
        ? 'bg-blue-600 text-white shadow-lg'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`;

  return (
    <div className="bg-gray-50 min-h-screen p-8 font-sans antialiased text-gray-900">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Automated Appointment Dashboard</h1>
          <p className="text-gray-500">Visualize and analyze your appointment data with interactive charts.</p>
          {uploadedFileName && (
            <p className="text-sm text-blue-600 mt-2">📁 Loaded: {uploadedFileName}</p>
          )}
        </header>

        {/* File Upload Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Import Data</h3>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
              >
                <UploadIcon size={20} />
                <span>Upload Excel/CSV File</span>
              </button>
              <button
                onClick={generateSampleData}
                className="flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-300"
              >
                <span>Use Sample Data</span>
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Supports .xlsx, .xls, and .csv files with columns: Χρήστης δημιουργίας, Υποκατάστημα, Ημερομηνία δημιουργίας, Source Type
            </p>
          </div>
        </div>

        {/* Enhanced Filters Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <FilterIcon size={20} className="mr-2" />
            Filters
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Source Filter */}
            <div>
              <label htmlFor="source-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Source Type
              </label>
              <select
                id="source-filter"
                value={selectedSource || ''}
                onChange={(e) => setSelectedSource(e.target.value === '' ? null : e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Sources</option>
                {uniqueSources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>

            {/* User Filter */}
            <div>
              <label htmlFor="user-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Select User
              </label>
              <select
                id="user-filter"
                value={selectedUser || ''}
                onChange={(e) => setSelectedUser(e.target.value === '' ? null : e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Users</option>
                {uniqueUsers.map((user) => (
                  <option key={user} value={user}>
                    {user}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                placeholderText="Select start date"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                dateFormat="yyyy-MM-dd"
              />
            </div>

            {/* End Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                placeholderText="Select end date"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                dateFormat="yyyy-MM-dd"
              />
            </div>

            {/* Call Center Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Type Filter
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="call-center-filter"
                  checked={showCallCenterOnly}
                  onChange={(e) => setShowCallCenterOnly(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="call-center-filter" className="ml-2 text-sm text-gray-700">
                  Call Center Users Only
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Filters users with call center, cc_, or κέντρο in name
              </p>
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => {
                setSelectedSource(null);
                setSelectedUser(null);
                setStartDate(null);
                setEndDate(null);
                setShowCallCenterOnly(false);
                setIncludedUsers(new Set()); // Clear user selections
              }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-300"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        {/* User Management Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <UsersIcon size={20} className="mr-2" />
              User Report Control
            </h3>
            <button
              onClick={() => setShowUserManagement(!showUserManagement)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
            >
              {showUserManagement ? 'Hide' : 'Manage Users'}
            </button>
          </div>
          
          <div className="mb-4 text-sm text-gray-600">
            <p>
              <strong>Included Users:</strong> {includedUsers.size === 0 ? 'All users' : `${includedUsers.size} selected users`}
            </p>
            <p className="text-xs mt-1">
              When no users are selected, all users will be included in reports. Select specific users to limit the report scope.
            </p>
          </div>
          
          {showUserManagement && (
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={includeAllUsers}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={excludeAllUsers}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                >
                  Clear All
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto border rounded-lg p-4">
                {uniqueUsers.map((user) => (
                  <label key={user} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={includedUsers.has(user)}
                      onChange={() => toggleUserInclusion(user)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-gray-700 truncate" title={user}>
                      {user}
                    </span>
                  </label>
                ))}
              </div>
              
              {uniqueUsers.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No users available. Upload data first.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Chart Selection Buttons */}
        <div className="flex justify-center flex-wrap gap-4 mb-8">
          <button onClick={() => setActiveChart('appointmentsByUser')} className={buttonClass('appointmentsByUser')}>
            <BarChartIcon size={18} />
            <span>Appointments by User</span>
          </button>
          <button onClick={() => setActiveChart('appointmentsBySource')} className={buttonClass('appointmentsBySource')}>
            <PieChartIcon size={18} />
            <span>Appointments by Source</span>
          </button>
          <button onClick={() => setActiveChart('appointmentsOverTime')} className={buttonClass('appointmentsOverTime')}>
            <LineChartIcon size={18} />
            <span>Appointments Over Time</span>
          </button>
          <button onClick={() => setActiveChart('appointmentsByStore')} className={buttonClass('appointmentsByStore')}>
            <StoreIcon size={18} />
            <span>Appointments by Store</span>
          </button>
        </div>

        {/* Statistics Summary */}
        {processedData && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {processedData.appointmentsByUser.reduce((sum, item) => sum + item.appointments, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Appointments</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {processedData.appointmentsByUser.length}
              </div>
              <div className="text-sm text-gray-600">Unique Users</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {processedData.appointmentsBySource.length}
              </div>
              <div className="text-sm text-gray-600">Source Types</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {processedData.appointmentsByStore.length}
              </div>
              <div className="text-sm text-gray-600">Store Locations</div>
            </div>
          </div>
        )}

        {/* Chart Display Area */}
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-8">
          {renderChart()}
        </div>
      </div>
    </div>
  );
};

export default App;
