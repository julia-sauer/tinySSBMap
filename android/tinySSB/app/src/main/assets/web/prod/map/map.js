// map.js

let map = null;
let myLocationMarker = null;

function load_map() {
    console.log("MAP OPENED");
    document.getElementById("div:map").style.display="block";

    if (map === null) {
        map = L.map("div:map").setView([47.5596, 7.5886], 14);

        L.tileLayer("prod/map/leaflet/tiles_bsl/{z}/{x}/{y}.png", {
            attribution: "Maptiler; OpenStreetMap contributors",
            maxZoom: 14,
            minZoom: 0,
        }).addTo(map);
    }

    map.invalidateSize();

    navigator.geolocation.getCurrentPosition(
        function(pos) {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;

            map.setView([lat, lon], 14);

            if (myLocationMarker !== null) {
                myLocationMarker.setLatLng([lat, lon]);
            } else {
                myLocationMarker = L.marker([lat, lon])
                .addTo(map)
                .bindPopup("You are here");
            }
        },
        function(err) {
            console.log("GPS error:", err.message);
        },
        {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
        }
    );
}