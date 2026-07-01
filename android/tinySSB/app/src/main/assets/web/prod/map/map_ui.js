// map_ui.js

var leafletMarkers = {}

function ui_add_marker(markerId) {
    var m = tremola.map[markerId];
    if (!m) {
        return;
    }

    var contact = tremola.contacts[m.author];
    var authorName = contact ? contact.alias : m.author;

    var lm = L.marker([m.lat, m.lon])
        .addTo(map).
        bindPopup(
            "<strong>" + escapeHTML(m.name) + "</strong><br>" + escapeHTML(m.description) + "<br>" +
            "<small>by " + escapeHTML(authorName) + "</small>",
        )
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
