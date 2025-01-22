import React, { createContext, useContext, useState, useEffect } from 'react';

const MapContext = createContext();

export const useMapState = () => {
  return useContext(MapContext);
};

export const MapProvider = ({ children }) => {
  const [filters, setFilters] = useState({
    status: 'Sold',
    stat: 'Inventory Count', // default
    time: '12 months',
    acres: 'All Acreages',
    layer: 'State',
  });
  
  const [dynamicTooltip, setDynamicTooltip] = useState(false);
  const [zoomToState, setZoomToState] = useState(false);
  const [enableZips, setEnableZips] = useState(false);
  const [isTimeSelectDisabled, setTimeSelectDisabled] = useState(false);

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "status" && { stat: 'Inventory Count' }), // Reset stat on status change
    }));

    if (name === 'status') {
      setTimeSelectDisabled(value === 'Pending');
    }
  };

  return (
    <MapContext.Provider value={{
      filters,
      setFilters,
      dynamicTooltip,
      setDynamicTooltip,
      zoomToState,
      setZoomToState,
      enableZips,
      setEnableZips,
      isTimeSelectDisabled,
      handleSelectChange,
    }}>
      {children}
    </MapContext.Provider>
  );
};
