function client() {
    const berLatLng = [52.5109937,13.4111919];
    const berlinMap = L.map('main').setView(berLatLng, 11.5);

    L.tileLayer(`https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=${accessToken}`, {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.streets',
        accessToken
    }).addTo(berlinMap);

    axios.get('/locations')
        .then(res => res.data)
        .then((locations) => {
            const markers = locations.map(loc => {
                const { position } = loc;
                if (position && position.lat && position.lon) {
                    const marker =  L.marker([position.lat, position.lon]).addTo(berlinMap);
                    const popupContent = `
                        <h2>${loc.Naam}</h2>
                        <p>${loc.Adres.replace(',', '<br/>')}</p>
                        <a href="${loc.Website}">${loc.Website}</a>
                    `;
                    marker.bindPopup(popupContent);
                    return marker;
                }
                return false;
            });
        });
}

window.addEventListener('DOMContentLoaded', client);