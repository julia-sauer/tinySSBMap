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

const personIcon = new L.Icon({
    iconUrl: "prod/map/leaflet/images/marker-icon-person.png",
    shadowUrl: "prod/map/leaflet/images/marker-shadow.png",
    iconSize: [25,41],
    iconAnchor: [12,41],
    popupAnchor: [1,-34]
});

var leafletMarkers = {}
var liveLocationMarkers = {}

function ui_add_marker(markerId) {
    var m = tremola.map[markerId];
    if (!m) {
        return;
    }

    var contact = tremola.contacts[m.author];
    var authorName = contact ? contact.alias : m.author;
    var isOwn = m.author === myId;

    var deleteLabel = isOwn ? "Delete for everyone" : "Delete for me";

    var editButton = isOwn ?
        "<button onclick='btn_open_edit_marker(\"" + markerId + "\")' " +
        "style='border:none; background:none; cursor:pointer;' title='Edit marker'>" +
        "<img src='img/pen.png' style='width:20px; height:20px;'>" +
        "</button>" : "";

    var popupContent =
        "<strong>" + escapeHTML(m.name) + "</strong><br>" +
        escapeHTML(m.description) + "<br>" +
        "<small>by " + escapeHTML(authorName) + "</small><br><br>" +
        editButton +
        "<button onclick='btn_delete_marker(\"" + markerId + "\", " + isOwn + ")' " +
        "style='border:none; background:none; cursor:pointer;' title='" + deleteLabel + "'>" +
        "<img src='img/delete-bin.svg' style='width:20px; height:20px;'>" +
        "</button>";

    var lm = L.marker([m.lat, m.lon], {icon: getMarkerIcon(m)})
        .addTo(map)
        .bindPopup(popupContent);
    leafletMarkers[markerId] = lm;
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
        if (markerId === "_locations") {
            continue;
        }
        if (markerId === "_locationPrivacy") {
            continue;
        }
        if (markerId === "_locationContacts") {
            continue;
        }
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

function ui_update_live_location(fid) {
    var loc = tremola.map._locations[fid];
    if (!loc) {
        return;
    }

    var contact = tremola.contacts[fid];
    var name = contact ? contact.alias : fid;
    var date = new Date(loc.when);
    var timeStr = date.toLocaleDateString() + " " + date.toTimeString().substring(0, 5);

    var popupContent =
        "<strong>" + escapeHTML(name) + "</strong><br>" +
        "<small>Last updated: " + timeStr + "</small>";

    if (fid in liveLocationMarkers) {
        // update existing marker
        liveLocationMarkers[fid].setLatLng([loc.lat, loc.lon]);
        liveLocationMarkers[fid].getPopup().setContent(popupContent);
    } else {
        liveLocationMarkers[fid] = L.marker([loc.lat, loc.lon], {
            icon: personIcon
        }).addTo(map).bindPopup(popupContent);
    }
}

function ui_remove_live_location(fid) {
    if (fid in liveLocationMarkers) {
        map.removeLayer(liveLocationMarkers[fid]);
        delete liveLocationMarkers[fid];
    }
}
