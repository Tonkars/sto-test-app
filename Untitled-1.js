  <div className="max-w-6xl mx-auto">
    <header className="mb-8 text-center">
      <h1 className="text-4xl font-bold text-gray-800 mb-2">Automated Appointment Dashboard</h1>
      <p className="text-gray-500">Visualize and analyze your appointment data with interactive charts.</p>
    </header>

    {/* Source Filter Dropdown */}
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-2">
        <label htmlFor="source-filter" className="font-semibold text-gray-700">Filter by Source:</label>
        <div className="relative">
          <select
            id="source-filter"
            value={selectedSource || ''}
            onChange={(e) => setSelectedSource(e.target.value === '' ? null : e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md shadow-sm transition-all duration-300 appearance-none bg-white cursor-pointer"
          >
            <option value="">All Sources</option>
            {uniqueSources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
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

    {/* Chart Display Area */}
    <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-8">
      {renderChart()}
    </div>
  </div>
</div>