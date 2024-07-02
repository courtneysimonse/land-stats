import './LegendControl.css';

const createLi = (category, unit) => {
  let li = document.createElement('li');
  li.innerText = unit + Math.round(category.title).toLocaleString();

  let symbol = document.createElement('span');
  symbol.style.background = category.color;
  symbol.style.borderColor = category.color;
  li.appendChild(symbol);

  return li
}

export default class LegendControl {
  constructor(categories) {
    this.categories = categories;
  }

  onAdd(map) {
    const categories = this.categories;

    this._map = map;
    this._container = document.createElement('div');
    this._container.className = 'mapboxgl-ctrl legend-ctrl map-ctrl';
    this._container.id = 'legend-ctrl';

    let legendHeading = document.createElement("h3");
    legendHeading.innerText = "Legend";

    this._legendSubHeading = document.createElement("h4");
    this._legendSubHeading.id = "legend-title";
    this._legendSubHeading.innerText = "State Level - Sold - 12 Months - All Acreages - Inventory Count";

    this._container.appendChild(legendHeading);
    this._container.appendChild(this._legendSubHeading);

    this._legendList = document.createElement('ul');
    this._legendList.id = "legend-list";

    categories.forEach(c => {
      this._legendList.appendChild(createLi(c, ''));
    });

    this._container.appendChild(this._legendList);

    return this._container;
  }
  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._map = undefined;
  }

  updateScale(categories, stat) {
    // Ensure the container and its elements are properly referenced
    if (!this._container || !this._legendSubHeading || !this._legendList) {
      return;
    }

    this._categories = categories;

    this._legendSubHeading.innerText = stat;

    // Clear the existing list items
    this._legendList.innerHTML = '';

    let unit = stat.includes("Price") ? "$" : "";

    this._categories.forEach(c => {
      this._legendList.appendChild(createLi(c, unit));
    });
  }
}