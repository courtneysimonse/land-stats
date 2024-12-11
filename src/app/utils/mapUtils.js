import config from "../components/mapConfig";

export const getStatsForAttribute = (map, sourceId, sourceLayers, attribute) => {
    const values = sourceLayers.reduce((acc, layer) => {
      const features = map.querySourceFeatures(sourceId, { sourceLayer: layer });
      return acc.concat(
          features.map(f => +f.properties[attribute]).filter(v => !isNaN(v))
      );
    }, []);

    if (!values.length) return null;
  
    values.sort((a, b) => a - b);
  
    const getPercentile = (data, p) => {
        const pos = (data.length - 1) * p;
        const base = Math.floor(pos);
        return data[base] + (pos - base) * (data[base + 1] - data[base]);
    };
  
    const min = values[0];
    const max = values[values.length - 1];
    const breaks = [getPercentile(values, 1 / 3), getPercentile(values, 2 / 3)];
  
    return { min, max, breaks };
};

export const calcBreaks = ({ min, max, breaks }) => {
    return [min, ...breaks, max].map((val, i) => ({
        title: val,
        color: config.colors[i],
    }));
};

export function createPopup(feature, {states, counties}, filters, dataDate) {
    let props = feature.properties;
    let popupContent = document.createElement('div');
    let listEl = document.createElement('ul');
  
    // Add layer and geo information
    listEl.appendChild(createListItem("LAYER:", feature.layer.id === 'states-totals' ? "State" : "County"));
    listEl.appendChild(createGeoListItem(feature, {states, counties}));
  
    // Add filter information
    listEl.appendChild(createListItem("TIMEFRAME:", filters.time));
    listEl.appendChild(createListItem("ACREAGE:", filters.acres));
    listEl.appendChild(createListItem("STATUS:", filters.status));
  
    // Construct the stat prefix
    let statPrefix = `${config.acresOptions[filters.acres]}.${config.timeOptions[filters.time]}`;
  
    // Add stats
    listEl.appendChild(createStatItem("Sold Count", props[`${statPrefix}.sold_count`], 'sold_count'));
    listEl.appendChild(createStatItem("For Sale Count", props[`${statPrefix}.for_sale_count`], 'for_sale_count'));
    listEl.appendChild(createStatItem("Pending Count", props[`${config.acresOptions[filters.acres]}.PENDING.for_sale_count`], 'pending.for_sale_count'));
  
    let soldCount = props[`${statPrefix}.sold_count`] ?? 0;
    let forSaleCount = props[`${statPrefix}.for_sale_count`] ?? 0;
    let strRaw = soldCount / forSaleCount;
    listEl.appendChild(createStatItem("STR", `${(100 * strRaw).toFixed(0)}%`, 'list_sale_ratio'));
  
    listEl.appendChild(createStatItem("DOM Sold", props[`${statPrefix}.sold_median_days_on_market`], 'sold_median_days_on_market'));
    listEl.appendChild(createStatItem("DOM For Sale", props[`${statPrefix}.for_sale_median_days_on_market`], 'for_sale_median_days_on_market'));
    listEl.appendChild(createStatItem("DOM Pending", props[`${config.acresOptions[filters.acres]}.PENDING.for_sale_median_days_on_market`], 'pending.for_sale_median_days_on_market'));
  
    listEl.appendChild(createStatItem("Median Price", props[`${statPrefix}.sold_median_price`], 'sold_median_price'));
    listEl.appendChild(createStatItem("Median PPA", props[`${statPrefix}.sold_median_price_per_acre`], 'sold_median_price_per_acre'));
    listEl.appendChild(createStatItem("Months Supply", props[`${statPrefix}.months_of_supply`], 'months_of_supply'));
  
    let absorptionRate = props[`${statPrefix}.absorption_rate`] * 100 ?? 0;
    listEl.appendChild(createStatItem("Absorption Rate", `${absorptionRate.toLocaleString()}%`, 'absorption_rate'));
  
    listEl.appendChild(createListItem("Date:", dataDate));
  
    popupContent.appendChild(listEl);

    function createStatItem(label, statValue = 0, propName) {
      if (!propName.includes('rate')) {
        statValue = statValue.toLocaleString();
      } 
      return createListItem(label, statValue, propName);
    } 

    return popupContent;
  }
  
  function createListItem(label, value, propName) {
    let li = document.createElement('li');
    li.innerHTML = `<strong>${label}</strong> ${value}`;
    li.dataset.stat = propName
    return li;
  }
  
  function createGeoListItem(feature, {states, counties}) {
    let li = document.createElement('li');
    let geoName = feature.layer.id === 'states-totals' 
      ? states.find(x => x["GEOID"] == feature.properties["GEOID"])?.NAME 
      : counties.find(x => x['GEOID'] == feature.id)?.NAME;
  
    li.innerHTML = `<strong>SELECTED:</strong> ${geoName || 'N/A'}`;
    return li;
  }
  
  export function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString();
  }