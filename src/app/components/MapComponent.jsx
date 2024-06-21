import React, { useEffect, useState } from "react";
import * as d3 from "d3-fetch";
import LegendControl from "./LegendControl";
import ZoomDisplayControl from "./ZoomDisplayControl";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";

import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

import "./MapComponent.css";

const colors = [
  "#0f9b4a",
  "#fecc08",
  "#f69938",
  "#f3663a"
];

const statCats = {
  "Sold": {
      "Inventory Count": "sold_count",
      "Median Price": "sold_median_price",
      "Median Price/Acre": "sold_median_price_per_acre",
      "Days on Market": "sold_median_days_on_market",
      "Sell Through Rate (STR)": "list_sale_ratio",
      "Absorption Rate": "absorption_rate",
      "Months of Supply": "months_of_supply"
  },
  "For Sale": {
      "Inventory Count": "for_sale_count",
      "Median Price": "for_sale_median_price",
      "Median Price/Acre": "for_sale_median_price_per_acre",
      "Days on Market": "for_sale_median_days_on_market",
      "Sell Through Rate (STR)": "list_sale_ratio",
      "Absorption Rate": "absorption_rate",
      "Months of Supply": "months_of_supply"
  },
  "Pending": {
      "Inventory Count": "for_sale_count",
      "Median Price": "for_sale_median_price",
      "Median Price/Acre": "for_sale_median_price_per_acre",
      "Days on Market": "for_sale_median_days_on_market",
      // "Sell Through Rate (STR)": "list_sale_ratio",
      // "Absorption Rate": "absorption_rate",
      // "Months of Supply": "months_of_supply"
  },
};

const timeFrames = {
  "7 days": "7d",
  "30 days": "30d",
  "90 days": "90d",
  "6 months": "6M",
  "12 months": "12M",
  "24 months": "24M",
  "36 months": "36M",
};

const acreageRanges = {
  "0-1 acres": "0-1",
  "1-2 acres": "1-2",
  "2-5 acres": "2-5",
  "5-10 acres": "5-10",
  "10-20 acres": "10-20",
  "20-50 acres": "20-50",
  "50-100 acres": "50-100",
  "100+ acres": "100+",
  "All Acreages": "TOTAL"
};

// load CSVs
const states = await d3.csv('./data/states.csv');
const counties = await d3.csv('./data/counties.csv');

// load propertyMinMaxs
const statesMinMax = await d3.json('./data/state_properties.json');
const countiesMinMax = await d3.json('./data/counties_properties.json');

const MapComponent = () => {
  const [status, setStatus] = useState("Sold");
  const [stat, setStat] = useState("sold_count");
  const [statOps, setStatOpts] = useState("");
  const [time, setTime] = useState("12 months");
  const [isTimeSelectDisabled, setTimeSelectDisabled] = useState(false);
  const [acres, setAcres] = useState("All Acreages");
  const [layer, setLayer] = useState("state");
  const [map, setMap] = useState(null);
  const [legendControl, setLegendControl] = useState(null);
  const [statesMinMax, setStatesMinMax] = useState({});
  const [countiesMinMax, setCountiesMinMax] = useState({});

  const updateStatsOpts = () => {
      // Filter options based on selected status
      const options = Object.entries(statCats[status]).map(([statLbl, statVar]) => (
        <option key={statVar} value={statVar}>
            {statLbl}
        </option>
    ));
    return options;
  }

  const calcBreaks = (data) => {
    return [
      data.min,
      ...data.breaks,
      data.max
    ];
  };


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

        let countyName = counties.find(x=> x['GEOID'] == feature.id).NAME
        geoLi.innerHTML = "<strong>SELECTED:</strong> " + countyName;
    }

    listEl.appendChild(layerLi);
    listEl.appendChild(geoLi);

    let timeLi = document.createElement('li');
    timeLi.innerHTML = "<strong>TIMEFRAME:</strong> " + time;
    listEl.appendChild(timeLi);

    let acreLi = document.createElement('li');
    acreLi.innerHTML = "<strong>ACREAGE:</strong> " + acres;
    listEl.appendChild(acreLi);

    let statusLi = document.createElement('li');
    statusLi.innerHTML = "<strong>STATUS:</strong> "+ status;
    listEl.appendChild(statusLi);

    // if (selectedStatus == "Pending") {
        
    // } else {
        
    // }

    listEl.appendChild(createLi("Sold Count: "+props[`${acreageRanges[acres]}.${timeFrames[time]}.sold_count`].toLocaleString(), 'sold_count'))

    listEl.appendChild(createLi("For Sale Count: "+props[`${acreageRanges[acres]}.${timeFrames[time]}.for_sale_count`].toLocaleString(), 'for_sale_count'))

    // listEl.appendChild(createLi("Pending Count: "+props[`${acreageRanges[acres]}.PENDING.for_sale_count`].toLocaleString(), 'pending.for_sale_count'))

    let str = 100*props[`${acreageRanges[acres]}.${timeFrames[time]}.list_sale_ratio`];
    listEl.appendChild(createLi("STR: "+ str.toFixed(0)+"%", 'list_sale_ratio'))

    listEl.appendChild(createLi("DOM Sold: "+props[`${acreageRanges[acres]}.${timeFrames[time]}.sold_median_days_on_market`].toLocaleString() + ' d', 'sold_median_days_on_market'))

    listEl.appendChild(createLi("DOM For Sale: "+props[`${acreageRanges[acres]}.${timeFrames[time]}.for_sale_median_days_on_market`].toLocaleString() + ' d', 'for_sale_median_days_on_market'))

    // listEl.appendChild(createLi("DOM Pending: "+props[`${acreageRanges[acres]}.PENDING.for_sale_median_days_on_market`].toLocaleString() + ' d', 'pending.for_sale_median_days_on_market'))

    listEl.appendChild(createLi("Median Price: $"+props[`${acreageRanges[acres]}.${timeFrames[time]}.sold_median_price`].toLocaleString(), 'sold_median_price'))

    // listEl.appendChild(createLi("Pending Median Price: $"+props[`${acreageRanges[acres]}.PENDING.for_sale_median_price`].toLocaleString(), 'pending.for_sale_median_price'))

    listEl.appendChild(createLi("Median PPA: $"+props[`${acreageRanges[acres]}.${timeFrames[time]}.sold_median_price_per_acre`].toLocaleString(), 'sold_median_price_per_acre'))

    // listEl.appendChild(createLi("Pending Median PPA: $"+props[`${acreageRanges[acres]}.PENDING.for_sale_median_price_per_acre`].toLocaleString(), 'pending.for_sale_median_price_per_acre'))

    listEl.appendChild(createLi("Months Supply: "+props[`${acreageRanges[acres]}.${timeFrames[time]}.months_of_supply`].toLocaleString(), 'months_of_supply'))

    listEl.appendChild(createLi("Absorption Rate: "+props[`${acreageRanges[acres]}.${timeFrames[time]}.absorption_rate`].toLocaleString(), 'absorption_rate'))

    // Object.entries(statCats[selectedStatus]).forEach(([l, v]) => {
    //     let statEl = document.createElement('li');
    //     let varName = `${acreageRanges[acres]}.${timeFrames[time]}.${v}`
    //     statEl.textContent = `${l}: ${props[varName].toLocaleString()}`
    //     listEl.appendChild(statEl);
    // })

    popupContent.appendChild(listEl);

    return popupContent;
  }

  function createLi(text, attr) {
    let li = document.createElement('li');
    li.innerText = text;
    li.dataset.stat = attr;
    return li;
  }

  useEffect(() => {
    const initializeMap = async () => {
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      
      const mapInstance = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/landstats/clvfmorch02dd01pecuq9e0hr',
        bounds: [[-128, 22], [-63, 55]],
        projection: 'mercator'
      });

      setMap(mapInstance);

      const states = await d3.csv('./data/states.csv');
      const counties = await d3.csv('./data/counties.csv');
      const statesMinMaxData = await d3.json('./data/state_properties.json');
      const countiesMinMaxData = await d3.json('./data/counties_properties.json');

      setStatesMinMax(statesMinMaxData);
      setCountiesMinMax(countiesMinMaxData);

      const defaultStateColors = mapInstance.getPaintProperty('states-totals', 'fill-color');
      const defaultCountyColors = mapInstance.getPaintProperty('counties-totals', 'fill-color');


      mapInstance.on('load', () => {

        mapInstance.addControl(
          new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl,
          }),
          'bottom-left'
        );
  
        mapInstance.addControl(new ZoomDisplayControl(), 'bottom-right')
  
        const legendControl = new LegendControl(calcBreaks(statesMinMaxData[`${acreageRanges[acres]}.${timeFrames[time]}.${stat}`]), colors);
        mapInstance.addControl(legendControl, 'bottom-right');
        setLegendControl(legendControl);

        setMap(mapInstance);

      })


      // mapInstance.on('zoomend', () => {
      //   if (mapInstance.getZoom() >= 9) {
      //     mapInstance.setLayoutProperty('zip-totals-Zoom 5', 'visibility', 'visible');
      //     mapInstance.setLayoutProperty('counties-totals', 'visibility', 'none');
      //     mapInstance.setLayoutProperty('states-totals', 'visibility', 'none');
      //     mapInstance.setFilter('states-totals', null);
      //   } else if (mapInstance.getZoom() >= 5) {
      //     mapInstance.setLayoutProperty('counties-totals', 'visibility', 'visible');
      //     mapInstance.setLayoutProperty('zip-totals-Zoom 5', 'visibility', 'none');
      //     mapInstance.setLayoutProperty('states-totals', 'visibility', 'none');
      //     mapInstance.setFilter('states-totals', null);
      //     legend.updateScale(calcBreaks(countiesMinMaxData[`${acreageRanges[acres]}.${timeFrames[time]}.${stat}`]));
      //   } else {
      //     mapInstance.setLayoutProperty('zip-totals-Zoom 5', 'visibility', 'none');
      //     mapInstance.setLayoutProperty('counties-totals', 'visibility', 'none');
      //     mapInstance.setLayoutProperty('states-totals', 'visibility', 'visible');
      //     mapInstance.setFilter('states-totals', null);
      //     legend.updateScale(calcBreaks(statesMinMaxData[`${acreageRanges[acres]}.${timeFrames[time]}.${stat}`]));
      //   }
      // });

      const tooltip = new mapboxgl.Popup({closeButton: false, className: 'map-tooltip'});

      mapInstance.on('mouseenter', ['states-totals', 'counties-totals-part-1', 'counties-totals-part-2', 'zip-totals-Zoom 5'], () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });

      mapInstance.on('mousemove', ['states-totals', 'counties-totals-part-1', 'counties-totals-part-2', 'zip-totals-Zoom 5'], (e) => {
        let popupContent = createPopup(e.features[0]);

        let highlighted = stat;
        if (status == "Pending") {
            highlighted = "pending."+stat
        }

        // add highlight
        let selectedLi = popupContent.querySelector(`[data-stat="${highlighted}"]`);
        if (selectedLi) {
            selectedLi.classList.add('selected');   
        }

        tooltip.setHTML(popupContent.outerHTML)
            .setLngLat(e.lngLat)
            .addTo(mapInstance)

      });

      mapInstance.on('mouseleave', ['states-totals', 'counties-totals-part-1', 'counties-totals-part-2', 'zip-totals-Zoom 5'], () => {
        mapInstance.getCanvas().style.cursor = '';
        tooltip.remove();
      });
    };

    if (!map) initializeMap();
  }, [map]);

  useEffect(() => {
    if (map && legendControl) {
      const updateColors = () => {
        let colorExps = setNewVariable();
        map.setPaintProperty('states-totals', 'fill-color', colorExps.state);
        map.setPaintProperty('counties-totals-part-1', 'fill-color', colorExps.county);
      };

      const setNewVariable = () => {
        let newVar = `${acreageRanges[acres]}.${timeFrames[time]}.${stat}`;

        let stateBreaks = calcBreaks(statesMinMax[newVar]);
        let varMinMaxState = statesMinMax[newVar];

        let countyBreaks = calcBreaks(countiesMinMax[newVar]);
        let varMinMaxCounty = countiesMinMax[newVar];

        let stateColor;

        if (varMinMaxState.max !== varMinMaxState.min) {
          stateColor = [
            "interpolate",
            ["linear"],
            ["get", newVar],
            varMinMaxState.min,
            "#0f9b4a",
            (varMinMaxState.max - varMinMaxState.min) * (1 / 3) + varMinMaxState.min,
            "#fecc08",
            (varMinMaxState.max - varMinMaxState.min) * (2 / 3) + varMinMaxState.min,
            "#f69938",
            varMinMaxState.max,
            "#f3663a"
          ];
        } else {
          stateColor = "#0f9b4a";
        }

        let countyColor;

        if (varMinMaxCounty.max !== varMinMaxCounty.min) {
          countyColor = [
            "interpolate",
            ["linear"],
            ["get", newVar],
            varMinMaxCounty.min,
            "#0f9b4a",
            (varMinMaxCounty.max - varMinMaxCounty.min) * (1 / 3) + varMinMaxCounty.min,
            "#fecc08",
            (varMinMaxCounty.max - varMinMaxCounty.min) * (2 / 3) + varMinMaxCounty.min,
            "#f69938",
            varMinMaxCounty.max,
            "#f3663a"
          ];
        } else {
          countyColor = "#0f9b4a";
        }

        return { state: stateColor, county: countyColor };
      };

      updateColors();
      // legendControl.updateScale(calcBreaks(statesMinMax[`${acreageRanges[acres]}.${timeFrames[time]}.${stat}`]));
    }
  }, [status, stat, time, acres, map, legendControl]);

  useEffect(() => {
    // const populateSelect = (selectId, options) => {
    //   return (
    //     <select id={selectId}>
    //         {Object.entries(options).map(([label, value]) => (
    //             <option key={value} value={value}>
    //                 {label}
    //             </option>
    //         ))}
    //     </select>
    // );
    // };

    // // populateSelect("status-select", { "Sold": "Sold", "For Sale": "For Sale" });
    // populateSelect("time-select", timeFrames);
    // populateSelect("acres-select", acreageRanges);

    // updateStatsOpts();


    // return () => {
      
    // };
  }, [status]);

  const handleStatusChange = (e) => {
    setStatus(e.target.value);

    setStatOpts(updateStatsOpts());

    // Update time select disabled state
    setTimeSelectDisabled(status === "Pending");
  }

  const handleTimeChange = (e) => {
    setTime(e.target.value);
  }

  const handleAcresChange = (e) => {
    setAcres(e.target.value);
  }

  const handleStatChange = (e) => {
    setStat(e.target.value)
  }

  const handleLayerChange = (e) => {
    setLayer(e.target.value);
    let statName = Object.keys(statCats[status]).find(key => statCats[status][key] === stat);
      
    if (e.target.value == 'county') {

        map.setLayoutProperty('counties-totals-part-1', 'visibility', 'visible');
        map.setLayoutProperty('counties-totals-part-2', 'visibility', 'visible');
        map.setLayoutProperty('counties-lines', 'visibility', 'visible');
        // map.setLayoutProperty('zip-totals-Zoom 5', 'visibility', 'none');
        map.setLayoutProperty('states-totals', 'visibility', 'none');
        map.setFilter('states-totals', null);

        let legendTitle;
        if (status == "Pending") {
            legendTitle = `${layer} Level - ${status} - ${statName}`;
        } else {
            legendTitle = `${layer} Level - ${status} - ${time} - ${statName}`;  
        } 

        // legendControl.updateScale(calcBreaks(countiesMinMax[`${acreageRanges[acres]}.${timeFrames[time]}.${stat}`]),
        //                                 legendTitle)
    } else {

        // map.setLayoutProperty('zip-totals-Zoom 5', 'visibility', 'none');
        map.setLayoutProperty('counties-totals-part-1', 'visibility', 'none');
        map.setLayoutProperty('counties-totals-part-2', 'visibility', 'none');
        map.setLayoutProperty('counties-lines', 'visibility', 'none');
        map.setLayoutProperty('states-totals', 'visibility', 'visible');
        map.setFilter('states-totals', null);
    
        let legendTitle;
        if (status == "Pending") {
            legendTitle = `${layer} Level - ${status} - ${statName}`;
        } else {
            legendTitle = `${layer} Level - ${status} - ${time} - ${statName}`;  
        } 

        // legendControl.updateScale(calcBreaks(statesMinMax[`${acreageRanges[acres]}.${timeFrames[time]}.${stat}`]),
        //      legendTitle)
    }
  }

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <div id="map-filters">
        <fieldset>
          <div className="filter-group">
            <label htmlFor="status-select">Status:</label>
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
            <select name="statistics" id="stats-select" value={stat} onChange={handleStatChange}></select>
          </div>
          <div className="filter-group">
              <label htmlfor="layer-select">Layers:</label>
              <select name="layers" id="layer-select" value={layer} onChange={handleLayerChange}>
                  <option value="state" selected>States</option>
                  <option value="county">Counties</option>
              </select>
          </div>
        </fieldset>
      </div>
      <div id="map"></div>
    </div>
  );
};

export default MapComponent;
