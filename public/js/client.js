function client() {
    const mainMap = L.map('main');
    return axios.get('/client_vars')
        .then(res => res.data)
        .then(({
            accessToken,
            locationVars,
            mapsVars,
        }) => {
            const { latLng, zoomLevel } = mapsVars;
            mainMap.setView(latLng, zoomLevel);


            L.tileLayer(`https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=${accessToken}`, {
                attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
                maxZoom: 18,
                id: 'mapbox.streets',
                accessToken
            }).addTo(mainMap);

        return axios.get('/locations')
            .then(res => ({
                locations: res.data,
                vars: locationVars,
            }));
    }).then(({locations, vars }) => {
        const markers = locations.map(loc => {
            const { position } = loc;
            const { name, address, website } = vars;
            if (position && position.lat && position.lon) {
                const marker =  L.marker([position.lat, position.lon]).addTo(mainMap);
                const popupContent = `
                    <h2>${loc[name]}</h2>
                    <p>${loc[address].replace(',', '<br/>')}</p>
                    <a href="${loc[website]}">${loc[website]}</a>
                `;
                marker.bindPopup(popupContent);
                return marker;
            }
            return false;
        });
    });
}

window.addEventListener('DOMContentLoaded', client);
