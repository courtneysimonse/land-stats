export default class ZoomDisplayControl {

    onAdd(map) {

        this._map = map;
        this._container = document.createElement('div');
        this._container.className = 'mapboxgl-ctrl zoom-ctrl map-ctrl';
        this._container.id = 'zoom-ctrl'

        let zoom = this._map.getZoom().toFixed(1);

        this._container.innerText = `Zoom: ${zoom}`

        this._map.on('zoomend', () => {
            zoom = this._map.getZoom().toFixed(1);
            this._container.innerText = `Zoom: ${zoom}`
        })

        return this._container;
    }
    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }

}