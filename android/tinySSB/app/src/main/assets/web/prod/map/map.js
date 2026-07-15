// map.js

// the user's map
let map = null;

// marker of the current location
let myLocationMarker = null;

// coordinates of the current location
let currentLat = null;
let currentLon = null;

const MapOp = {
    MARKER_CREATE: 'map/marker/create',
    MARKER_DELETE: 'map/marker/delete',
    LOCATION_UPDATE: 'map/location/update',
    LOCATION_REMOVE: 'map/location/remove',
}

const locationPrivacyIcons = {
    "private": "img/lock.svg",
    "contacts": "img/contacts.svg",
    "public": "img/globe.svg",
};

// initializes the map including markers and centers the view to the user's location
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

// loads all shared live locations onto the map
function load_live_locations() {
    if (!tremola.map || !tremola.map._locations) {
        return;
    }
    for (var fid in tremola.map._locations) {
        ui_update_live_location(fid);
    }
}

// restores the saved live location privacy setting in the UI
function restore_location_privacy() {
    if (!tremola.map || !tremola.map._locationPrivacy) {
        return;
    }
    var privacy = tremola.map._locationPrivacy;
    document.getElementById("location_privacy_btn").textContent = "";
    document.getElementById("location_privacy_btn").style.backgroundImage = "url('" + locationPrivacyIcons[privacy] + "')";
    document.querySelector('input[name="loc_privacy"][value="' + privacy + '"]').checked = true;
}

// updates the user's current location and shares it based on privacy settings
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

// displays the contact selection list for location sharing
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

// returns the list of contacts selected for location sharing
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

// opens the dialog for creating a new marker
function btn_create_marker() {
    document.getElementById("markerForm").style.display = "block";
}

// creates a new marker and sends it to the backend
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

    var markerId = myId + "_" + Date.now().toString();

    var data = {
        'cmd': [MapOp.MARKER_CREATE, markerId, name, description, currentLat.toString(), currentLon.toString(), privacy],
        'recps': recipients.length > 0 ? recipients : null
    }

    console.log("Name: " + name + " Description: " + description + " Privacy: " + privacy);
    map_send_to_backend(data);
    document.getElementById("markerForm").style.display = "none"; // close marker menu
}

// closes the marker creation dialog without saving
function btn_cancel_marker() {
    document.getElementById("markerForm").style.display = "none";
}

// encodes and sends a map command to the backend
function map_send_to_backend(data) {
    var op = data['cmd'][0]
    var args = data['cmd'].length > 1 ? btoa(data['cmd'].slice(1).map(unicodeStringToTypedArray).map(btoa)) : "null"
    var recps = data['recps'] != null && data['recps'].length > 0 ? btoa(data['recps'].map(unicodeStringToTypedArray).map(btoa)) : "null"

    var to_backend = ['map', op, args, recps]
    backend(to_backend.join(" "))
}

// processes incoming map events and updates the local map state
function map_new_event(e) {
    console.log("map_new_event received:", e);
    var payload = e.public || e.confid;  // public for everyone, confid for encrypted
    if (!payload) return;

    var op = payload[1]
    var args = payload.length > 2 ? payload.slice(2) : []

    if (!tremola.map) tremola.map = {}

    switch (op) {
        case MapOp.MARKER_CREATE:
            var markerId = args[0];
            console.log("MARKER_CREATE key:", markerId, "author:", e.header.fid);
            tremola.map[markerId] = {
                'id': markerId,
                'name': args[1],
                'description': args[2],
                'lat': parseFloat(args[3]),
                'lon': parseFloat(args[4]),
                'privacy': args[5],
                'author': e.header.fid,
                'when': e.header.tst
            }
            ui_add_marker(markerId);
            break;
        case MapOp.MARKER_DELETE:
            var markerId = args[0];
            console.log("MARKER_DELETE received, markerId:", markerId);
            console.log("tremola.map keys:", Object.keys(tremola.map));
            console.log("markerId in tremola.map:", markerId in tremola.map);
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
        case MapOp.LOCATION_REMOVE:
            var authorFid = e.header.fid;
            if (tremola.map._locations && authorFid in tremola.map._locations) {
                delete tremola.map._locations[authorFid];
                ui_remove_live_location(authorFid);
            }
            break;
    }
    persist();
}

// updates the marker contact picker when the privacy setting changes
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

// displays the contact selection list for marker sharing
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

// returns the contacts selected for a shared marker
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

// deletes a marker locally and notifies others if it's the own marker
function btn_delete_marker(markerId, isOwn) {
    console.log("btn_delete_marker markerId:", markerId);
    console.log("Alice tremola.map keys:", Object.keys(tremola.map));
    ui_remove_marker(markerId); // close popup and remove from map

    if (isOwn) {
        // tell everyone to delete it if it's the own marker
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

// opens the live location privacy settings dialog
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

// updates the location contact picker when the privacy option changes
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

// saves the selected location privacy settings and applies the changes
function btn_confirm_location_privacy() {
    var privacy = document.querySelector('input[name="loc_privacy"]:checked').value;
    var oldPrivacy = tremola.map && tremola.map._locationPrivacy ? tremola.map._locationPrivacy : "private";
    var oldContacts = tremola.map && tremola.map._locationContacts ? tremola.map._locationContacts : [];

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

    send_location_remove_to_revoked(oldPrivacy, oldContacts, privacy, tremola.map._locationContacts || []);
    if (privacy !== "private" && oldPrivacy === "private") {
        btn_update_location();
    }

    // update the privacy button emoji
    document.getElementById("location_privacy_btn").textContent = "";
    document.getElementById("location_privacy_btn").style.backgroundImage = "url('" + locationPrivacyIcons[privacy] + "')";
    document.getElementById("locationPrivacyDialog").style.display = "none";
}

// closes the location privacy dialog without saving
function btn_cancel_location_privacy() {
    document.getElementById("locationPrivacyDialog").style.display = "none";
}

// sends location removal events to users who no longer have access
function send_location_remove_to_revoked(oldPrivacy, oldContacts, newPrivacy, newContacts) {
    var revoked = [];

    if (oldPrivacy === "public" && newPrivacy !== "public") {
        var data = {
            'cmd': [MapOp.LOCATION_REMOVE],
            'recps': null
        }
        map_send_to_backend(data);
        return;
    }

    if (oldPrivacy === "contacts" && newPrivacy === "private") {
        revoked = oldContacts;
    } else if (oldPrivacy === "contacts" && newPrivacy === "contacts") {
        revoked = oldContacts.filter(function (fid) {
            return newContacts.indexOf(fid) < 0;
        });
    } else if (oldPrivacy === "public" && newPrivacy === "contacts") {
        var data = {
            'cmd': [MapOp.LOCATION_REMOVE],
            'recps': null
        }
        map_send_to_backend(data);
        return;
    }

    if (revoked.length === 0) {
        return;
    }

    var recipients = revoked.concat([myId]);
    var data = {
        'cmd': [MapOp.LOCATION_REMOVE],
        'recps': recipients
    }
    map_send_to_backend(data);
}

// id of marker that is edited
var currentEditMarkerId = null;

// opens the marker edit dialog and loads the marker's current data
function btn_open_edit_marker(markerId) {
    var m = tremola.map[markerId];
    if (!m) {
        return;
    }

    currentEditMarkerId = markerId;

    // pre-fill form with current values
    document.getElementById("marker_edit_name").value = m.name;
    document.getElementById("marker_edit_description").value = m.description;
    document.getElementById("marker_edit_privacy").value = m.privacy;

    // show contacts picker if needed
    if (m.privacy === "contacts") {
        document.getElementById("marker_edit_contacts_picker").style.display = "block";
        renderEditContactPicker();
    } else {
        document.getElementById("marker_edit_contacts_picker").style.display = "none";
    }

    // close the popup and open the edit form
    leafletMarkers[markerId].closePopup();
    document.getElementById("markerEditForm").style.display = "block";
}

// updates the edit contact picker when the marker privacy changes
function onEditPrivacyChange() {
    var privacy = document.getElementById("marker_edit_privacy").value;
    var picker = document.getElementById("marker_edit_contacts_picker");
    if (privacy === "contacts") {
        picker.style.display = "block";
        renderEditContactPicker();
    } else {
        picker.style.display = "none";
    }
}

// displays the contact selection list for editing a shared marker
function renderEditContactPicker() {
    var picker = document.getElementById("marker_edit_contacts_picker");
    picker.innerHTML = "";

    for (var fid in tremola.contacts) {
        if (fid === myId) {
            continue;
        }
        var contact = tremola.contacts[fid];
        var row = document.createElement("div");
        row.className = "marker_contact_row";
        row.innerHTML =
            "<input type='checkbox' id='edit_contact_" + fid + "' value='" + fid + "'>" +
            "<label for='edit_contact_" + fid + "'>" + escapeHTML(contact.alias) + "</label>";
        picker.appendChild(row);
    }
}

// returns the contacts selected while editing a marker
function getSelectedEditContacts() {
    var selected = [];
    for (var fid in tremola.contacts) {
        var checkbox = document.getElementById("edit_contact_" + fid);
        if (checkbox && checkbox.checked) {
            selected.push(fid);
        }
    }
    return selected;
}

// saves the edited marker by replacing the old marker with a new one (delete old, create new marker)
function btn_save_edit_marker() {

    var old = tremola.map[currentEditMarkerId];
    if (!old) {
        return;
    }

    var name = document.getElementById("marker_edit_name").value.trim();
    var description = document.getElementById("marker_edit_description").value.trim();
    var privacy = document.getElementById("marker_edit_privacy").value;

    if (name === "") {
        alert("Please enter a name.");
        return;
    }

    var recipients = [];

    if (privacy === "contacts") {
        recipients = getSelectedEditContacts();

        if (recipients.length === 0) {
            alert("Please select at least one contact.");
            return;
        }

    } else if (privacy === "private") {
        recipients = [myId];
    }

    // delete old marker
    map_send_to_backend({
        cmd: [MapOp.MARKER_DELETE, old.id],
        recps: null
    });

    // create new marker
    var newMarkerId = myId + "_" + Date.now();

    map_send_to_backend({
        cmd: [
            MapOp.MARKER_CREATE,
            newMarkerId,
            name,
            description,
            old.lat.toString(),
            old.lon.toString(),
            privacy
        ],
        recps: recipients
    });

    // remove locally
    ui_remove_marker(old.id);
    delete tremola.map[old.id];

    document.getElementById("markerEditForm").style.display = "none";
    currentEditMarkerId = null;
}

// closes the marker edit dialog without saving
function btn_cancel_edit_marker() {
    document.getElementById("markerEditForm").style.display = "none";
    currentEditMarkerId = null;
}