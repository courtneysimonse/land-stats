import React, { useEffect, useState, useRef, useCallback } from "react";
import * as d3 from "d3-fetch";
import LegendControl from "./LegendControl";
import ZoomDisplayControl from "./ZoomDisplayControl";
import FilterControls from "./FilterControls";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import config from "./mapConfig";
import { getStatsForAttribute, calcBreaks, createPopup, formatDate } from "./mapUtils";

import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

import "./MapComponent.css";

const filterConfigs = [
  { label: "Status", name: "status", options: Object.keys(config.statusOptions) },
  { label: "Time", name: "time", options: Object.keys(config.timeOptions) },
  { label: "Acreages", name: "acres", options: Object.keys(config.acresOptions) },
  { label: "Statistics", name: "stat" },
  { label: "Layer", name: "layer", options: ["State", "County"] },
];

const MapComponent = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [filters, setFilters] = useState({
    status: "Sold",
    stat: config.statOptions["Sold"]["Inventory Count"],
    time: "12 months",
    acres: "All Acreages",
    layer: "State",
  });
  const [legendControl, setLegendControl] = useState(null);
  const [states, setStates] = useState(null);
  const [counties, setCounties] = useState(null);
  const [timestamp, setTimestamp] = useState(null); 
  const [isTimeSelectDisabled, setTimeSelectDisabled] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statesData, countiesData, timestampData] = await Promise.all([
          d3.csv('./data/states.csv'),
          d3.csv('./data/counties.csv'),
          fetchTimestamp(),
        ]);
  
        setStates(statesData);
        setCounties(countiesData);
        setTimestamp(timestampData);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    }

    const fetchTimestamp = async () => {
      const response = await fetch('https://landstats-timestamp-api.replit.app/timestamp');
      if (response.status != 200) {
        return ""; // Set timestamp to empty string on 404
      }
      const data = await response.json();
      return data.data.timestamp;
    };
    loadData()
  }, []);

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "status" && { stat: config.statOptions[value]["Inventory Count"] }), // Reset stat on status change
    }));

    if (name === "layer") handleLayerChange(e);

    // Disable time select if status is "Pending"
    if (name === "status") {
      setTimeSelectDisabled(value === "Pending");
    }
  };


  // const handleStatusChange = (e) => {
  //   setStatus(e.target.value);
  //   if (e.target.value == "Sold") {
  //     setStat('sold_count');
  //   } else {
  //     setStat('for_sale_count');
  //   }

  //   // Update time select disabled state
  //   setTimeSelectDisabled(e.target.value === "Pending");
  // }

  const updateColors = useCallback(() => {

    const mapLayers = filters.layer === "State" ? config.stateLayers : config.countyLayers;

    const varName = filters.status === "Pending" ? `${config.acresOptions[filters.acres]}.PENDING.${filters.stat}` : `${config.acresOptions[filters.acres]}.${config.timeOptions[filters.time]}.${filters.stat}`;

    const stats = getStatsForAttribute(map.current, 'composite', mapLayers, varName);
    console.debug('Min:', stats.min);
    console.debug('Max:', stats.max);
    console.debug('Terciles:', stats.breaks);

    if (!stats) return;

    const categories = calcBreaks(stats);

    const colorExp = [
      'case', 
      ['has', `${varName}`],
      [
      'interpolate',
      ['linear'],
      ['get', `${varName}`],
      ...categories.flatMap(category => [category.title, category.color])
      ],
      ["rgba", 255, 255, 255, 0]
    ];

    mapLayers.forEach(l => {
      map.current.setPaintProperty(l, 'fill-color', colorExp);
    })

    if (legendControl) {
      let statName = Object.keys(config.statOptions[filters.status]).find(key => config.statOptions[filters.status][key] === filters.stat);
      let legendTitle = filters.status === "Pending" ? `${filters.layer} Level - ${filters.status} - ${statName}` : 
        `${filters.layer} Level - ${filters.status} - ${filters.time} - ${statName}`

      legendControl.updateScale(categories, legendTitle);
    }
  }, [ map, filters ]);

  useEffect(() => {
    if (map.current && map.current.loaded() && map.current.idle()) {
      updateColors();
      // updateColors("State");
      // updateColors("County");
    }
  }, [updateColors]);

  useEffect(() => {
    if (!states || !counties || timestamp == undefined) return; // Wait for the data to load
    
    if (map.current) return; // initialize map only once

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    let timestampMessage = "";

    try {
      timestampMessage = timestamp 
        ? `Data as of: ${formatDate(timestamp)}`
        : "";
    } catch (error) {
      console.error("Error accessing or formatting timestamp:", error);
    }    
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: config.style,
      bounds: config.bounds,
      projection: 'mercator',
      customAttribution: timestampMessage
    });
    
    map.current.addControl(new ZoomDisplayControl(), 'bottom-right');

    let legend = new LegendControl(calcBreaks(config.initialBreaks))
    setLegendControl(legend);
    map.current.addControl(legend, 'bottom-right');

    map.current.addControl(
      new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
      }),
      'bottom-left'
    );

    // const tooltip = new mapboxgl.Popup({closeButton: false, className: 'map-tooltip'});

    // map.current.on('load', () => {

    //   map.current.on('mouseenter', [...config.layers], () => {
    //     map.current.getCanvas().style.cursor = 'pointer';
    //   });
  
    //   map.current.on('mousemove', [...config.layers], (e) => {
    //     let popupContent = createPopup(e.features[0], {states, counties}, filters, timestampMessage);
  
    //     let highlighted = filters.stat;
    //     if (filters.status == "Pending") {
    //         highlighted = "pending."+filters.stat
    //     }
  
    //     // add highlight
    //     let selectedLi = popupContent.querySelector(`[data-stat="${highlighted}"]`);
    //     if (selectedLi) {
    //         selectedLi.classList.add('selected');   
    //     }
  
    //     tooltip.setHTML(popupContent.outerHTML)
    //         .setLngLat(e.lngLat)
    //         .addTo(map.current)
  
    //   });
  
    //   map.current.on('mouseleave', [...config.layers], () => {
    //     map.current.getCanvas().style.cursor = '';
    //     tooltip.remove();
    //   });
  
    //   const popup = new mapboxgl.Popup({closeButton: true, className: 'map-tooltip'});
    //   map.current.on('click', [...config.stateLayers, ...config.countyLayers], (e) => {
    //     tooltip.remove();
        
    //     let popupContent = createPopup(e.features[0], {states, counties}, filters, timestampMessage);
  
    //     let popupBtn = document.createElement('a');
    //     popupBtn.classList = 'btn btn-primary';
    //     popupBtn.innerText = "Go to Table";
  
    //     // add link to button
    //     if (e.features[0].layer.id == 'states-totals') {
    //       let stateAbbrev = states.find(x=> x["GEOID"] == e.features[0].properties["GEOID"]).STUSPS
    //       popupBtn.setAttribute('href', `${process.env.NEXT_PUBLIC_BASE_URL}search-results?state=${stateAbbrev}`)
    //     } else {
    //       popupBtn.setAttribute('href', `${process.env.NEXT_PUBLIC_BASE_URL}search-results?county=${e.features[0].id.toString().padStart(5, '0')}`)
    //     }
  
    //     let highlighted = filters.stat;
    //     if (filters.status == "Pending") {
    //         highlighted = "pending."+filters.stat
    //     }
  
    //     // add highlight
    //     let selectedLi = popupContent.querySelector(`[data-stat="${highlighted}"]`);
    //     if (selectedLi) {
    //         selectedLi.classList.add('selected');   
    //     }
  
    //     popupContent.appendChild(popupBtn);
  
    //     popup.setHTML(popupContent.outerHTML)
    //         .setLngLat(e.lngLat)
    //         .addTo(map.current)

    //     if (config.countyLayers.includes(e.features[0].layer.id)) {
          
    //     }
  
    //   });
    // })
    

    return () => {
      if (map.current) {
        map.current.off('mouseenter');
        map.current.off('mousemove');
        map.current.off('mouseleave');
        map.current.off('click');
      }
    };

  }, [states, counties, timestamp]);

  useEffect(() => {
    if (!map.current || !map.current.loaded) return; // Ensure map is initialized
  
    const tooltip = new mapboxgl.Popup({ closeButton: false, className: 'map-tooltip' });
    const popup = new mapboxgl.Popup({ closeButton: true, className: 'map-tooltip' });
  
    const handleMouseMove = (e) => {
      // Add date information
      let dataDate = formatDate(timestamp);
      let feature = e.features[0];
      if (feature.layer.id === 'states-totals' && feature.properties["timestamp"]) {
        dataDate = formatDate(feature.properties["timestamp"]);
      } else if (config.countyLayers.includes(feature.layer.id)) {
        const stateFeatures = map.current.querySourceFeatures('composite',
          {
            sourceLayer: 'states-totals',
            filter: ["==", ["get", "GEOID"], feature.properties["ST_GEOID"]]
          }
        )
        if (stateFeatures.length > 0) {
          dataDate = formatDate(stateFeatures[0].properties["timestamp"]);
        }
        
      }
      const popupContent = createPopup(feature, { states, counties }, filters, dataDate);
      
      let highlighted = filters.stat;
      if (filters.status === "Pending") {
        highlighted = "pending." + filters.stat;
      }
  
      const selectedLi = popupContent.querySelector(`[data-stat="${highlighted}"]`);
      if (selectedLi) selectedLi.classList.add('selected');
  
      tooltip.setHTML(popupContent.outerHTML)
        .setLngLat(e.lngLat)
        .addTo(map.current);
    };
  
    const handleClick = (e) => {
      tooltip.remove();
      
      const popupContent = createPopup(e.features[0], { states, counties }, filters, formatDate(timestamp));
      
      const popupBtn = document.createElement('a');
      popupBtn.className = 'btn btn-primary';
      popupBtn.innerText = "Go to Table";
  
      const featureId = e.features[0].id.toString().padStart(5, '0');
      const stateAbbrev = states.find(x => x["GEOID"] === e.features[0].properties["GEOID"])?.STUSPS;
      
      const href = e.features[0].layer.id === 'states-totals'
        ? `${process.env.NEXT_PUBLIC_BASE_URL}search-results?state=${stateAbbrev}`
        : `${process.env.NEXT_PUBLIC_BASE_URL}search-results?county=${featureId}`;
      
      popupBtn.setAttribute('href', href);
  
      popupContent.appendChild(popupBtn);
  
      popup.setHTML(popupContent.outerHTML)
        .setLngLat(e.lngLat)
        .addTo(map.current);
    };
  
    map.current.on('mousemove', [...config.layers], handleMouseMove);
    map.current.on('click', [...config.stateLayers, ...config.countyLayers], handleClick);
  
    return () => {
      map.current.off('mousemove', handleMouseMove);
      map.current.off('click', handleClick);
    };
  
  }, [filters, states, counties, timestamp]); // Dependencies ensure updates on filter changes.
  

  const handleLayerChange = (e) => {
    const newLayer = e.target.value;
    setFilters(prev => ({ ...prev, layer: newLayer }));
    
    const statName = Object.keys(config.statOptions[filters.status]).find(
      key => config.statOptions[filters.status][key] === filters.stat
    );

    const isCounty = newLayer === 'County';
    const mapLayers = isCounty ? config.countyLayers : config.stateLayers;
    const visibilityMap = {
      'counties-totals-part-1': isCounty,
      'counties-totals-part-2': isCounty,
      'counties-lines': isCounty,
      'states-totals': !isCounty,
    };

    Object.entries(visibilityMap).forEach(([layer, visible]) => {
      map.current.setLayoutProperty(layer, 'visibility', visible ? 'visible' : 'none');
    });

    const variablePrefix = filters.status === "Pending"
    ? `${config.acresOptions[filters.acres]}.PENDING.${filters.stat}`
    : `${config.acresOptions[filters.acres]}.${config.timeOptions[filters.time]}.${filters.stat}`;

    const stats = getStatsForAttribute(map.current, 'composite', mapLayers, variablePrefix);
    const breaks = calcBreaks(stats);

    const legendTitle = `${newLayer} Level - ${filters.status} - ${filters.status === "Pending" ? statName : `${filters.time} - ${statName}`}`;
    legendControl.updateScale(breaks, legendTitle);

  }

  return (
    <div 
      style={{ 
        height: "100%", 
        width: "100%",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        // flexWrap: "wrap",
        justifyContent: "center"
      }}>
      <FilterControls
        filters={filters}
        handleSelectChange={handleSelectChange}
        filterConfigs={filterConfigs}
        isTimeSelectDisabled={isTimeSelectDisabled}
      />
      <div id="map"
        ref={mapContainer}
        style={{
          width: "100%",
          flexGrow: 2,
          position: "relative",
        }} />
    </div>
  );
};

export default MapComponent;