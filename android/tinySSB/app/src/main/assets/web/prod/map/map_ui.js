// map_ui.js

const greenIcon = new L.Icon({
    iconUrl: "prod/map/leaflet/images/marker-icon-green.png",
    shadowUrl: "prod/map/leaflet/images/marker-shadow.png",
    iconSize: [25,41],
    iconAnchor: [12,41],
    popupAnchor: [1,-34]
});

const redIcon = new L.Icon({
    iconUrl: "prod/map/leaflet/images/marker-icon-red.png",
    shadowUrl: "prod/map/leaflet/images/marker-shadow.png",
    iconSize: [25,41],
    iconAnchor: [12,41],
    popupAnchor: [1,-34]
});

const yellowIcon = new L.Icon({
    iconUrl: "prod/map/leaflet/images/marker-icon-yellow.png",
    shadowUrl: "prod/map/leaflet/images/marker-shadow.png",
    iconSize: [25,41],
    iconAnchor: [12,41],
    popupAnchor: [1,-34]
});

const violetIcon = new L.Icon({
    iconUrl: "prod/map/leaflet/images/marker-icon-violet.png",
    shadowUrl: "prod/map/leaflet/images/marker-shadow.png",
    iconSize: [25,41],
    iconAnchor: [12,41],
    popupAnchor: [1,-34]
});

const blackIcon = new L.Icon({
    iconUrl: "prod/map/leaflet/images/marker-icon-black.png",
    shadowUrl: "prod/map/leaflet/images/marker-shadow.png",
    iconSize: [25,41],
    iconAnchor: [12,41],
    popupAnchor: [1,-34]
});

var leafletMarkers = {}

function ui_add_marker(markerId) {
    var m = tremola.map[markerId];
    if (!m) {
        return;
    }

    var contact = tremola.contacts[m.author];
    var authorName = contact ? contact.alias : m.author;
    var isOwn = m.author === myId;

    var deleteLabel = isOwn ? "Delete for everyone" : "Delete for me";

    var popupContent =
            "<strong>" + escapeHTML(m.name) + "</strong><br>" +
            escapeHTML(m.description) + "<br>" +
            "<small>by " + escapeHTML(authorName) + "</small><br><br>" +
            "<button onclick='btn_delete_marker(\"" + markerId + "\", " + isOwn + ")' " +
            "style='border:none; background:none; cursor:pointer;' title='" + deleteLabel + "'>" +
            "<img src='img/delete-bin.svg' style='width:20px; height:20px;'>" +
            "</button>";

        var lm = L.marker([m.lat, m.lon], {icon: getMarkerIcon(m)})
            .addTo(map)
            .bindPopup(popupContent);
    leafletMarkers[markerId] = lm
}

function ui_remove_marker(markerId) {
    if (markerId in leafletMarkers) {
        map.removeLayer(leafletMarkers[markerId]);
        delete leafletMarkers[markerId];
    }
}

function load_all_markers() {
    if (!tremola.map) {
        return;
    }
    for (var markerId in tremola.map) {
        ui_add_marker(markerId);
    }
}

function getMarkerIcon(m) {

    // Eigener Marker
    if (m.author === myId) {

        if (m.privacy === "private")
            return redIcon;

        if (m.privacy === "contacts")
            return yellowIcon;

        return greenIcon;
    }

    // Marker von anderen

    if (m.author in tremola.contacts)
        return violetIcon;

    return blackIcon;
}
