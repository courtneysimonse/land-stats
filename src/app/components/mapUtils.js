export const getStatsForAttribute = (map, sourceId, sourceLayers, attribute) => {
    const features = sourceLayers.flatMap(layer => 
      map.querySourceFeatures(sourceId, { sourceLayer: layer })
    );
  
    const values = features
      .map(f => +f.properties[attribute])
      .filter(v => !isNaN(v));
  
    if (values.length === 0) return null;
  
    values.sort((a, b) => a - b);
  
    const getPercentile = (data, p) => {
      const pos = (data.length - 1) * p;
      const base = Math.floor(pos);
      return base < data.length - 1 
        ? data[base] + (pos - base) * (data[base + 1] - data[base]) 
        : data[base];
    };
  
    const min = values[0];
    const max = values[values.length - 1];
    const breaks = [getPercentile(values, 1 / 3), getPercentile(values, 2 / 3)];
  
    return { min, max, breaks };
  };
  
  export const calcBreaks = ({ min, max, breaks }) => {
    const colors = ["#0f9b4a", "#fecc08", "#f69938", "#f3663a"];
    return [min, ...breaks, max].map((val, i) => ({
      title: val,
      color: colors[i],
    }));
  };
  
  export const createPopup = (feature, states, counties, filters) => {
    const props = feature.properties;
    const content = document.createElement('div');
    const list = document.createElement('ul');
  
    const items = [
      { label: "Layer", value: feature.layer.id.includes("state") ? "State" : "County" },
      { label: "Timeframe", value: filters.time },
      { label: "Acreage", value: filters.acres },
      { label: "Status", value: filters.status },
      { label: "Sold Count", value: props.sold_count ?? 0 },
    ];
  
    items.forEach(({ label, value }) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${label}:</strong> ${value}`;
      list.appendChild(li);
    });
  
    content.appendChild(list);
    return content.outerHTML;
  };
  