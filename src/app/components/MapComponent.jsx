import React, { useEffect, useState, useRef, useCallback } from "react";
import * as d3 from "d3-fetch";
import LegendControl from "./LegendControl";
import ZoomDisplayControl from "./ZoomDisplayControl";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import config from "./mapConfig";

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

  function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString();
  }

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
      try {
        const response = await fetch('https://landstats-timestamp-api.replit.app/timestamp');
        if (response.status === 404) {
          return ""; // Set timestamp to empty string on 404
        }
        const data = await response.json();
        return data.data.timestamp;
      } catch (error) {
        console.error("Error fetching timestamp:", error);
        return null; // Default to empty string on error
      }
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
  };

  const calcBreaks = (data) => {
    let breaks = [
      data.min,
      ...data.breaks,
      data.max
    ];

    let breaksSet = new Set(breaks);

    let categories = [];

    let i = 0;
    breaksSet.forEach((b) => {
      // if (b == 0) {
      //   categories.push({
      //     title: b,
      //     color: "#e3e3e3"
      //   })
      // } else {
        categories.push({
          title: b,
          color: config.colors[i]
        })
        i++;
      // }
    })

    return categories;
  };

  function getStatsForAttribute(sourceId, sourceLayers, attribute) {
    // Query features from the source
    const features = [];

    sourceLayers.forEach(sourceLayer => {
      let newFeatures = map.current.querySourceFeatures(sourceId, {
        sourceLayer: sourceLayer
      });
      features.push(...newFeatures);
    })

    if (features.length == 0) return;

    // Extract attribute values, filter out non-numeric or null values
    const values = features
        .map(feature => feature.properties[attribute])
        .filter(value => typeof +value === 'number' && !isNaN(+value));

    if (values.length === 0) {
        return { min: null, max: null, breaks: [], filteredValues: [] };
    }

    // Sort values in ascending order
    values.sort((a, b) => a - b);

    // Helper function to calculate specific percentile
    const getPercentile = (sortedValues, p) => {
      const pos = (sortedValues.length - 1) * p;
      const base = Math.floor(pos);
      const rest = pos - base;

      if (sortedValues[base + 1] !== undefined) {
          return sortedValues[base] + rest * (sortedValues[base + 1] - sortedValues[base]);
      } else {
          return sortedValues[base];
      }
    };

    // Calculate 33.3rd and 66.6th percentiles for terciles
    const T1 = getPercentile(values, 1 / 3);  // 33.3rd percentile
    const T2 = getPercentile(values, 2 / 3);  // 66.6th percentile

    // Define thresholds for outliers using T1 and T2 (optional)
    const ITR = T2 - T1;  // Inter-tercile range (analogous to IQR)
    const lowerBound = T1 - 1.5 * ITR;
    const upperBound = T2 + 1.5 * ITR;

    // Filter out outliers
    const filteredValues = values.filter(value => value >= lowerBound && value <= upperBound);

    // Recalculate min, max, and terciles after filtering
    const min = values.filter(v => v != 0)[0];
    const max = values[values.length - 1];
    const breaks = [
      getPercentile(filteredValues, 1 / 3),
      getPercentile(filteredValues, 2 / 3)
    ];

    return { min, max, breaks };
  }

  const updateColors = useCallback((geo) => {

    const mapLayers = filters.layer === "State" ? config.stateLayers : config.countyLayers;
    const varName = `${config.acresOptions[filters.acres]}.${config.timeOptions[filters.time]}.${filters.stat}`;

    const stats = getStatsForAttribute('composite', mapLayers, varName);
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

    if (legendControl && filters.layer == geo) {
      let statName = Object.keys(config.statOptions[filters.status]).find(key => config.statOptions[filters.status][key] === filters.stat);
      let legendTitle = filters.status === "Pending" ? `${filters.layer} Level - ${filters.status} - ${statName}` : 
        `${filters.layer} Level - ${filters.status} - ${filters.time} - ${statName}`

      legendControl.updateScale(categories, legendTitle);
    }
  }, [map, filters, legendControl ]);

  useEffect(() => {
    if (map.current && map.current.loaded() && map.current.idle()) {
      updateColors("State");
      updateColors("County");
    }
  }, [updateColors]);

  useEffect(() => {
    if (!states || !counties || !timestamp) return; // Wait for the data to load
    
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

    function createPopup(feature) {

      let props = feature.properties;
      
      let popupContent = document.createElement('div');

      let listEl = document.createElement('ul');

      let layerLi = document.createElement('li');
      let geoLi = document.createElement('li');
      if (feature.layer.id == 'states-totals') {
          layerLi.innerHTML = "<strong>LAYER:</strong> State";

          let stateName = states.find(x=> x["GEOID"] == props["GEOID"]).NAME
          geoLi.innerHTML = "<strong>SELECTED:</strong> " + stateName;

      } else {
          layerLi.innerHTML = "<strong>LAYER:</strong> County"

          let countyFeature = counties.find(x=> x['GEOID'] == feature.id);
          
          let countyName = counties.find(x=> x['GEOID'] == feature.id).NAME ?? "";
          geoLi.innerHTML = "<strong>SELECTED:</strong> " + countyName;
      }

      listEl.appendChild(layerLi);
      listEl.appendChild(geoLi);

      let timeLi = document.createElement('li');
      timeLi.innerHTML = "<strong>TIMEFRAME:</strong> " + filters.time;
      listEl.appendChild(timeLi);

      let acreLi = document.createElement('li');
      acreLi.innerHTML = "<strong>ACREAGE:</strong> " + filters.acres;
      listEl.appendChild(acreLi);

      let statusLi = document.createElement('li');
      statusLi.innerHTML = "<strong>STATUS:</strong> "+ filters.status;
      listEl.appendChild(statusLi);

      let statPrefix = `${config.acresOptions[filters.acres]}.${config.timeOptions[filters.time]}`;

      let soldCount = props[`${statPrefix}.sold_count`] ?? 0;
      listEl.appendChild(createLi(`Sold Count: ${soldCount.toLocaleString()}`, 'sold_count'));
      
      let forSaleCount = props[`${statPrefix}.for_sale_count`] ?? 0;
      listEl.appendChild(createLi("For Sale Count: "+forSaleCount.toLocaleString(), 'for_sale_count'))

      let pendingCount = props[`${config.acresOptions[filters.acres]}.PENDING.for_sale_count`] ?? 0;
      listEl.appendChild(createLi("Pending Count: "+pendingCount.toLocaleString(), 'pending.for_sale_count'))

      let strRaw = soldCount / forSaleCount;
      let str = 100*strRaw;
      listEl.appendChild(createLi("STR: "+ str.toFixed(0)+"%", 'list_sale_ratio'))

      let domSold = props[`${statPrefix}.sold_median_days_on_market`] ?? 0;
      listEl.appendChild(createLi("DOM Sold: "+domSold.toLocaleString() + ' d', 'sold_median_days_on_market'))

      let domForSale = props[`${statPrefix}.for_sale_median_days_on_market`] ?? 0;
      listEl.appendChild(createLi("DOM For Sale: "+domForSale.toLocaleString() + ' d', 'for_sale_median_days_on_market'))

      let domPending = props[`${statPrefix}.PENDING.for_sale_median_days_on_market`] ?? 0;
      listEl.appendChild(createLi("DOM Pending: "+domPending.toLocaleString() + ' d', 'pending.for_sale_median_days_on_market'))

      let medianPrice = props[`${statPrefix}.sold_median_price`] ?? 0; 
      listEl.appendChild(createLi("Median Price: $"+medianPrice.toLocaleString(), 'sold_median_price'))

      let medianPpa = props[`${statPrefix}.sold_median_price_per_acre`] ?? 0;
      listEl.appendChild(createLi("Median PPA: $"+medianPpa.toLocaleString(), 'sold_median_price_per_acre'))

      let monthsSupply = props[`${statPrefix}.months_of_supply`] ?? 0;
      listEl.appendChild(createLi("Months Supply: "+ monthsSupply.toLocaleString(), 'months_of_supply'))

      let absorptionRate = props[`${statPrefix}.absorption_rate`] * 100 ?? 0;
      listEl.appendChild(createLi("Absorption Rate: "+absorptionRate.toLocaleString()+"%", 'absorption_rate'))

      let dateEl = document.createElement('li');
      dateEl.innerText = timestampMessage;
      listEl.appendChild(dateEl);

      popupContent.appendChild(listEl);

      return popupContent;
    }

    function createLi(text, attr) {
      let li = document.createElement('li');
      li.innerText = text;
      li.dataset.stat = attr;
      return li;
    }

    // const defaultStateColors = map.current.getPaintProperty('states-totals', 'fill-color');
    // const defaultCounty1Colors = map.current.getPaintProperty('counties-totals-part-1', 'fill-color');
    // const defaultCounty2Colors = map.current.getPaintProperty('counties-totals-part-2', 'fill-color');


    // map.current.on('zoomend', () => {
    //   if (map.current.getZoom() >= 9) {
    //     map.current.setLayoutProperty('zip-totals-Zoom 5', 'visibility', 'visible');
    //     map.current.setLayoutProperty('counties-totals', 'visibility', 'none');
    //     map.current.setLayoutProperty('states-totals', 'visibility', 'none');
    //     map.current.setFilter('states-totals', null);
    //   } else if (map.current.getZoom() >= 5) {
    //     map.current.setLayoutProperty('counties-totals', 'visibility', 'visible');
    //     map.current.setLayoutProperty('zip-totals-Zoom 5', 'visibility', 'none');
    //     map.current.setLayoutProperty('states-totals', 'visibility', 'none');
    //     map.current.setFilter('states-totals', null);
    //     legend.updateScale(calcBreaks(countiesMinMax[`${acreageRanges[acres]}.${timeFrames[time]}.${stat}`]));
    //   } else {
    //     map.current.setLayoutProperty('zip-totals-Zoom 5', 'visibility', 'none');
    //     map.current.setLayoutProperty('counties-totals', 'visibility', 'none');
    //     map.current.setLayoutProperty('states-totals', 'visibility', 'visible');
    //     map.current.setFilter('states-totals', null);
    //     legend.updateScale(calcBreaks(statesMinMax[`${acreageRanges[acres]}.${timeFrames[time]}.${stat}`]));
    //   }
    // });

    const tooltip = new mapboxgl.Popup({closeButton: false, className: 'map-tooltip'});

    map.current.on('load', () => {

      config.countyLayers.forEach(layer => map.current.setPaintProperty(layer, 'fill-color', [
        "case",
        [
          "has",
          "TOTAL.12M.sold_count"
        ],
        [
          "interpolate",
          ["linear"],
          [
            "get",
            "TOTAL.12M.sold_count"
          ],
          0,
          "#0f9b4a",
          15,
          "#fecc08",
          73,
          "#f69938",
          291,
          "#f3663a"
        ],
        ["rgba", 255, 255, 255, 0]
      ]))

      map.current.setPaintProperty('states-totals', 'fill-color', [
        "case",
        [
          "has",
          "TOTAL.12M.sold_count"
        ],
        [
          "interpolate",
          ["linear"],
          [
            "get",
            "TOTAL.12M.sold_count"
          ],
          353,
          "#0f9b4a",
          2562,
          "#fecc08",
          6395,
          "#f69938",
          17085,
          "#f3663a"
        ],
        ["rgba", 255, 255, 255, 0]
      ])

      map.current.on('mouseenter', [...config.stateLayers, ...config.countyLayers], () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });
  
      map.current.on('mousemove', [...config.stateLayers, ...config.countyLayers], (e) => {
        let popupContent = createPopup(e.features[0]);
  
        let highlighted = filters.stat;
        if (filters.status == "Pending") {
            highlighted = "pending."+filters.stat
        }
  
        // add highlight
        let selectedLi = popupContent.querySelector(`[data-stat="${highlighted}"]`);
        if (selectedLi) {
            selectedLi.classList.add('selected');   
        }
  
        tooltip.setHTML(popupContent.outerHTML)
            .setLngLat(e.lngLat)
            .addTo(map.current)
  
      });
  
      map.current.on('mouseleave', [...config.stateLayers, ...config.countyLayers], () => {
        map.current.getCanvas().style.cursor = '';
        tooltip.remove();
      });
  
      const popup = new mapboxgl.Popup({closeButton: true, className: 'map-tooltip'});
      map.current.on('click', [...config.stateLayers, ...config.countyLayers], (e) => {
        tooltip.remove();
        
        let popupContent = createPopup(e.features[0]);
  
        let popupBtn = document.createElement('a');
        popupBtn.classList = 'btn btn-primary';
        popupBtn.innerText = "Go to Table";
  
        // add link to button
        if (e.features[0].layer.id == 'states-totals') {
          let stateAbbrev = states.find(x=> x["GEOID"] == e.features[0].properties["GEOID"]).STUSPS
          popupBtn.setAttribute('href', `${process.env.NEXT_PUBLIC_BASE_URL}search-results?state=${stateAbbrev}`)
        } else {
          popupBtn.setAttribute('href', `${process.env.NEXT_PUBLIC_BASE_URL}search-results?county=${e.features[0].id.toString().padStart(5, '0')}`)
        }
  
        let highlighted = filters.stat;
        if (filters.status == "Pending") {
            highlighted = "pending."+filters.stat
        }
  
        // add highlight
        let selectedLi = popupContent.querySelector(`[data-stat="${highlighted}"]`);
        if (selectedLi) {
            selectedLi.classList.add('selected');   
        }
  
        popupContent.appendChild(popupBtn);
  
        popup.setHTML(popupContent.outerHTML)
            .setLngLat(e.lngLat)
            .addTo(map.current)

        if (config.countyLayers.includes(e.features[0].layer.id)) {
          
        }
  
      });
    })
    

    return () => {
      if (map.current) {
        map.current.off('mouseenter');
        map.current.off('mousemove');
        map.current.off('mouseleave');
        map.current.off('click');
      }
    };

  }, [states, counties, timestamp]);

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

    const stats = getStatsForAttribute('composite', mapLayers, variablePrefix);
    const breaks = calcBreaks(stats);

    const legendTitle = `${newLayer} Level - ${filters.status} - ${filters.status === "Pending" ? statName : `${filters.time} - ${statName}`}`;
    legendControl.updateScale(breaks, legendTitle);

    // if (e.target.value == 'County') {

    //   countiesLayers.forEach(layer => map.current.setLayoutProperty(layer, 'visibility', 'visible'))

    //   map.current.setLayoutProperty('counties-lines', 'visibility', 'visible');
    //   // map.setLayoutProperty('zip-totals-Zoom 5', 'visibility', 'none');
    //   map.current.setLayoutProperty('states-totals', 'visibility', 'none');
    //   map.current.setFilter('states-totals', null);

    //   let legendTitle;
    //   let breaks;
    //   if (filters.status == "Pending") {
    //       legendTitle = `${e.target.value} Level - ${filters.status} - ${statName}`;
    //       let stats = getStatsForAttribute('composite', countiesLayers, `${config.acresOptions[filters.acres]}.PENDING.${filters.stat}`);
    //       breaks = calcBreaks(stats);

    //   } else {
    //       legendTitle = `${e.target.value} Level - ${filters.status} - ${filters.time} - ${statName}`; 
    //       let stats = getStatsForAttribute('composite', countiesLayers, `${config.acresOptions[filters.acres]}.${config.timeOptions[filters.time]}.${filters.stat}`);
    //       breaks = calcBreaks(stats);

    //   } 

    //   legendControl.updateScale(
    //     breaks,
    //     legendTitle
    //   )
    // } else {

    //     // map.setLayoutProperty('zip-totals-Zoom 5', 'visibility', 'none');
    //     map.current.setLayoutProperty('counties-totals-part-1', 'visibility', 'none');
    //     map.current.setLayoutProperty('counties-totals-part-2', 'visibility', 'none');
    //     map.current.setLayoutProperty('counties-lines', 'visibility', 'none');
    //     map.current.setLayoutProperty('states-totals', 'visibility', 'visible');
    //     map.current.setFilter('states-totals', null);
    
    //     let legendTitle;
    //     let breaks;

    //     if (filters.status == "Pending") {
    //         legendTitle = `${e.target.value} Level - ${filters.status} - ${statName}`;
    //         let stats = getStatsForAttribute('composite', config.stateLayers, `${config.acresOptions[filters.acres]}.PENDING.${filters.stat}`);
    //         breaks = calcBreaks(stats);

    //     } else {
    //         legendTitle = `${e.target.value} Level - ${filters.status} - ${filters.time} - ${statName}`; 
    //         let stats = getStatsForAttribute('composite', config.stateLayers, `${config.acresOptions[filters.acres]}.${config.timeOptions[filters.time]}.${filters.stat}`);
    //         breaks = calcBreaks(stats);

    //     } 

    //     legendControl.updateScale(
    //       breaks,
    //       legendTitle
    //     )
    // }
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
      <div id="map-filters">
        <fieldset>
          {filterConfigs.map(({ label, name, options }) => {
              console.log("Rendering filter:", label);
              console.log("Current filter name:", name);
              console.log("Current filter value:", filters[name]);
              
              const selectOptions = name === "stat" ? config.statOptions[filters.status] : options;
              console.log("Stat options:", selectOptions);

              return (
                <div key={name} className="filter-group">
                  <label htmlFor={`${name}-select`}>{label}:</label>
                  <select
                    id={`${name}-select`}
                    name={name}
                    value={filters[name]}
                    onChange={handleSelectChange}
                  >
                    {name === "stat" 
                      ? Object.entries(selectOptions || {}).map(([optionLabel, optionValue]) => (
                          <option key={optionValue || optionLabel} value={optionValue || optionLabel}>
                            {optionLabel}
                          </option>
                        ))
                      : options.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))
                    }
                  </select>
                </div>
              );
            })}

            {/* <label htmlFor="status-select">Status:</label>
            <select 
              name="status"
              id="status-select" 
              value={status} 
              onChange={handleStatusChange}
            >
              {Object.keys(statCats).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))} 
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="time-select">Time Frame:</label>
            <select 
              name="time-frame" 
              id="time-select" 
              value={time} 
              onChange={handleTimeChange}
              disabled={isTimeSelectDisabled}
            >
              {Object.keys(timeFrames).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))} 
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="acres-select">Acreages:</label>
            <select
              name="acreages" 
              id="acres-select" 
              value={acres} 
              onChange={handleAcresChange}
            >
              {Object.keys(acreageRanges).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))} 
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="stats-select">Statistics:</label>
            <select name="statistics" id="stats-select" value={stat} onChange={handleStatChange}>
              {updateStatsOpts()}
            </select>
          </div>
          <div className="filter-group">
              <label htmlFor="layer-select">Layers:</label>
              <select 
                name="layers" 
                id="layer-select" 
                value={layer}
                onChange={handleLayerChange}
              >
                <option value="State">States</option>
                <option value="County">Counties</option>
              </select>
          </div> */}
        </fieldset>
      </div>
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