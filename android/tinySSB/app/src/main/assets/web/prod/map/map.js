// map.js

let map = null;
let myLocationMarker = null;
let currentLat = null;
let currentLon = null;

const MapOp = {
    MARKER_CREATE: 'map/marker/create',
    MARKER_DELETE: 'map/marker/delete',
    LOCATION_UPDATE: 'map/location/update',
}

const locationPrivacyIcons = {
    "private": "img/lock.svg",
    "contacts": "img/contacts.svg",
    "public": "img/globe.svg",
};

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
            currentLat = pos.coords.latitude;
            currentLon = pos.coords.longitude;
            console.log("GPS position:", currentLat, currentLon); // for debugging

            map.setView([currentLat, currentLon], 14);

            if (myLocationMarker !== null) {
                myLocationMarker.setLatLng([currentLat, currentLon]);
            } else {
                myLocationMarker = L.marker([currentLat, currentLon])
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

    load_all_markers();
    load_live_locations();
    restore_location_privacy();
}

function load_live_locations() {
    if (!tremola.map || !tremola.map._locations) {
        return;
    }
    for (var fid in tremola.map._locations) {
        ui_update_live_location(fid);
    }
}

function restore_location_privacy() {
    if (!tremola.map || !tremola.map._locationPrivacy) {
        return;
    }
    var privacy = tremola.map._locationPrivacy;
    document.getElementById("location_privacy_btn").textContent = "";
    document.getElementById("location_privacy_btn").style.backgroundImage = "url('" + locationPrivacyIcons[privacy] + "')";
    document.querySelector('input[name="loc_privacy"][value="' + privacy + '"]').checked = true;
}

function btn_update_location() {
    navigator.geolocation.getCurrentPosition(
        function(pos) {
            currentLat = pos.coords.latitude;
            currentLon = pos.coords.longitude;
            console.log("Location updated:", currentLat, currentLon);

            if (myLocationMarker !== null) {
                myLocationMarker.setLatLng([currentLat, currentLon]);
                myLocationMarker.getPopup().setContent("You are here");
            } else {
                myLocationMarker = L.marker([currentLat, currentLon])
                    .addTo(map)
                    .bindPopup("You are here");
            }
            map.panTo([currentLat, currentLon]); // go to new location

            var privacy = tremola.map && tremola.map._locationPrivacy ? tremola.map._locationPrivacy : "private";
            if (privacy === "private") {
                return;
            }

            var recipients = null;
            if (privacy === "contacts") {
                recipients = tremola.map._locationContacts || [];
                if (recipients.length === 0) {
                    return;
                }
            }

            var data = {
                'cmd': [MapOp.LOCATION_UPDATE, currentLat.toString(),
                    currentLon.toString(), Date.now().toString(), privacy],
                'recps': recipients
            }
            map_send_to_backend(data);
        },
        function(err) { console.log("GPS error:", err.message); },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

function renderLocationContactPicker() {
    var picker = document.getElementById("location_contacts_picker");
    picker.innerHTML = "";

    var savedContacts = tremola.map && tremola.map._locationContacts ? tremola.map._locationContacts : [];

    for (var fid in tremola.contacts) {
        if (fid === myId) {
            continue;
        }
        var contact = tremola.contacts[fid];
        var isChecked = savedContacts.indexOf(fid) >= 0 ? "checked" : "";
        var row = document.createElement("div");
        row.className = "marker_contact_row";
        row.innerHTML =
            "<input type='checkbox' id='loc_contact_" + fid + "' value='" + fid + "' " + isChecked + ">" +
            "<label for='loc_contact_" + fid + "'>" + escapeHTML(contact.alias) + "</label>";
        picker.appendChild(row);
    }
}

function getSelectedLocationContacts() {
    var selected = [];
    for (var fid in tremola.contacts) {
        var checkbox = document.getElementById("loc_contact_" + fid);
        if (checkbox && checkbox.checked) {
            selected.push(fid);
        }
    }
    return selected;
}

function btn_create_marker() {
    document.getElementById("markerForm").style.display = "block";
}

function btn_add_marker() {
    var name = document.getElementById("marker_name").value;
    var description = document.getElementById("marker_description").value;
    var privacy = document.getElementById("marker_privacy").value;

    if (name === "") {
        alert("Please enter a name for the marker.");
        return;
    }

    if (currentLat === null || currentLon === null) {
        alert("No GPS location available yet.");
        return;
    }

    var recipients = [];
    if (privacy === "contacts") {
        recipients = getSelectedContacts();
        if (recipients.length === 0) {
            alert("Please select at least one contact.");
            return;
        }
    } else if (privacy === "private") {
        recipients = [myId]
    } // if privacy === "public", recipients stays empty => meaning everyone

    var data = {
        'cmd': [MapOp.MARKER_CREATE, name, description, currentLat.toString(), currentLon.toString(), privacy],
        'recps': recipients
    }

    console.log("Name: " + name + " Description: " + description + " Privacy: " + privacy);
    map_send_to_backend(data);
    document.getElementById("markerForm").style.display = "none"; // close marker menu
}

function btn_cancel_marker() {
    document.getElementById("markerForm").style.display = "none";
}

function map_send_to_backend(data) {
    var op = data['cmd'][0]
    var args = data['cmd'].length > 1 ? btoa(data['cmd'].slice(1).map(unicodeStringToTypedArray).map(btoa)) : "null"
    var recps = data['recps'] != null && data['recps'].length > 0 ? btoa(data['recps'].map(unicodeStringToTypedArray).map(btoa)) : "null"

    var to_backend = ['map', op, args, recps]
    backend(to_backend.join(" "))
}

function map_new_event(e) {
    console.log("map_new_event received:", e);
    var payload = e.public || e.confid;  // public for everyone, confid for encrypted
    if (!payload) return;

    var op = payload[1]
    var args = payload.length > 2 ? payload.slice(2) : []

    if (!tremola.map) tremola.map = {}

    switch (op) {
        case MapOp.MARKER_CREATE:
            var markerId = e.header.ref
            tremola.map[markerId] = {
                'id': markerId,
                'name': args[0],
                'description': args[1],
                'lat': parseFloat(args[2]),
                'lon': parseFloat(args[3]),
                'privacy': args[4],
                'author': e.header.fid,
                'when': e.header.tst
            }
            ui_add_marker(markerId);
            break;
        case MapOp.MARKER_DELETE:
            var markerId = args[0];
            if (markerId in tremola.map) {
                delete tremola.map[markerId];
                ui_remove_marker(markerId);
            }
            break;
        case MapOp.LOCATION_UPDATE:
            var authorFid = e.header.fid;

            if (authorFid === myId) { // ignore own location events
                break;
            }

            if (!tremola.map._locations) {
                tremola.map._locations = {};
            }

            tremola.map._locations[authorFid] = {
                'lat': parseFloat(args[0]),
                'lon': parseFloat(args[1]),
                'when': parseInt(args[2]),
                'author': authorFid
            }
            ui_update_live_location(authorFid);
            break;
    }
    persist();
}

function onPrivacyChange() {
    var privacy = document.getElementById("marker_privacy").value;
    var picker = document.getElementById("marker_contacts_picker");

    if (privacy === "contacts") {
        picker.style.display = "block";
        renderContactPicker();
    } else {
        picker.style.display = "none";
    }
}

function renderContactPicker() {
    var picker = document.getElementById("marker_contacts_picker");
    picker.innerHTML = "";

    for (var fid in tremola.contacts) {
        if (fid === myId) continue; // skip yourself

        var contact = tremola.contacts[fid];
        var row = document.createElement("div");
        row.className = "marker_contact_row";
        row.innerHTML =
            "<input type='checkbox' id='contact_" + fid + "' value='" + fid + "'>" +
            "<label for='contact_" + fid + "'>" + escapeHTML(contact.alias) + "</label>";
        picker.appendChild(row);
    }
}

function getSelectedContacts() {
    var selected = [];
    for (var fid in tremola.contacts) {
        var checkbox = document.getElementById("contact_" + fid);
        if (checkbox && checkbox.checked) {
            selected.push(fid);
        }
    }
    return selected;
}

function btn_delete_marker(markerId, isOwn) {
    ui_remove_marker(markerId); // close popup and remove from map

    if (isOwn) {
        // tell everyone to delete it if it's own marker
        var data = {
            'cmd': [MapOp.MARKER_DELETE, markerId],
            'recps': null
        }
        map_send_to_backend(data);
    }

    // always remove locally regardless of ownership
    delete tremola.map[markerId];
    persist();
}

function btn_open_location_privacy_dialog() {
    var saved = tremola.map && tremola.map._locationPrivacy ? tremola.map._locationPrivacy : "private";
    document.querySelector('input[name="loc_privacy"][value="' + saved + '"]').checked = true;

    if (saved === "contacts") {
        document.getElementById("location_contacts_picker").style.display = "block";
        renderLocationContactPicker();
    } else {
        document.getElementById("location_contacts_picker").style.display = "none";
    }

    document.getElementById("locationPrivacyDialog").style.display = "block";
}

function onLocationDialogPrivacyChange() {
    var privacy = document.querySelector('input[name="loc_privacy"]:checked').value;
    var picker = document.getElementById("location_contacts_picker");
    if (privacy === "contacts") {
        picker.style.display = "block";
        renderLocationContactPicker();
    } else {
        picker.style.display = "none";
    }
}

function btn_confirm_location_privacy() {
    var privacy = document.querySelector('input[name="loc_privacy"]:checked').value;

    if (privacy === "contacts") {
        var selected = getSelectedLocationContacts();
        if (selected.length === 0) {
            alert("Please select at least one contact.");
            return;
        }
        if (!tremola.map) tremola.map = {};
        tremola.map._locationContacts = selected;
    }

    if (!tremola.map) tremola.map = {};
    tremola.map._locationPrivacy = privacy;
    persist();

    // update the privacy button emoji
    document.getElementById("location_privacy_btn").textContent = "";
    document.getElementById("location_privacy_btn").style.backgroundImage = "url('" + locationPrivacyIcons[privacy] + "')";
    document.getElementById("locationPrivacyDialog").style.display = "none";
}

function btn_cancel_location_privacy() {
    document.getElementById("locationPrivacyDialog").style.display = "none";
}