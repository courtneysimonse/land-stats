export default class LegendControl {
  constructor(breaks, colors) {
    this.breaks = breaks;
    this.colors = colors;
  }

  onAdd(map) {
    let breaks = this.breaks;
    let colors = this.colors;

    this._map = map;
    this._container = document.createElement('div');
    this._container.className = 'mapboxgl-ctrl legend-ctrl';
    this._container.id = 'legend-ctrl'

    var legendHTML = "<h3>Legend</h3>";

    this._container.innerHTML = legendHTML;

    var legendPart = document.createElement('div');
    var legendList = '';

    legendList += '<ul id="legend-list"><li><span style="background:' + colors[0] + '"></span>' + Math.round(breaks[0]).toLocaleString();
    legendList += '<li><span style="background:' + colors[1] + '"></span>' + Math.round(breaks[1]).toLocaleString();
    legendList += '<li><span style="background:' + colors[2] + '"></span>' + Math.round(breaks[2]).toLocaleString();
    legendList += '<li><span style="background:' + colors[3] + '"></span>' + Math.round(breaks[3]).toLocaleString();

    legendList += '</ul>';
    legendPart.innerHTML = legendList;

    this._container.appendChild(legendPart);


    return this._container;
  }
  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._map = undefined;
  }

  updateScale(breaks) {
    let colors = this.colors;

    let legendDiv = document.getElementById('legend-ctrl');

    var legendHTML = "<h3>Legend</h3>";

    legendDiv.innerHTML = legendHTML;

    var legendPart = document.createElement('div');
    var legendList = '';

    legendList += '<ul id="legend-list"><li><span style="background:' + colors[0] + '"></span>' + Math.round(breaks[0]).toLocaleString();
    legendList += '<li><span style="background:' + colors[1] + '"></span>' + Math.round(breaks[1]).toLocaleString();
    legendList += '<li><span style="background:' + colors[2] + '"></span>' + Math.round(breaks[2]).toLocaleString();
    legendList += '<li><span style="background:' + colors[3] + '"></span>' + Math.round(breaks[3]).toLocaleString();

    legendList += '</ul>';
    legendPart.innerHTML = legendList;

    legendDiv.appendChild(legendPart);

  }
}
