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
            console.log("GPS position:", lat, lon); // for debugging

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

function btn_create_marker() {
    document.getElementById("markerForm").style.display = "block";
}

function btn_add_marker() {
    document.getElementById("markerForm").style.display = "none";

    var name = document.getElementById("marker_name").value;

    var description = document.getElementById("marker_description").value;

    var privacy = document.getElementById("marker_privacy").value;
    var recipients = [];

    if (privacy === "contacts") {
        recipients = getSelectedContacts();
    } else if (privacy === "private") {
        recipients = [myId]
    }
    // if privacy === "public", recipients stays empty — meaning unencrypted/everyone

    console.log("Name: " + name + " Description: " + description + " Privacy: " + privacy); // TODO: ACTUALLY CREATING A MARKER
}

function btn_cancel_marker() {
    document.getElementById("markerForm").style.display = "none";
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