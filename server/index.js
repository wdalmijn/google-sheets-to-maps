const express = require('express');
const os = require('os');
const dotenv = require('dotenv');
dotenv.config();

const { setupDatabase } = require('./db');
const { preloadData } = require('./loadData');
const {
    ADDRESS_FIELD_NAME,
    NAME_FIELD_NAME,
    WEBSITE_FIELD_NAME,
    LAT,
    LON,
    MAPS_API_KEY,
    MAPS_ZOOM_LEVEL,
    PORT,
} = process.env;

function checkAndLoadDataIfNeeded(db, forceRefresh = false) {
    return new Promise((resolve, reject) => {
        db.count({ Naam: { $exists: true } }, function(err, count) {
            if (forceRefresh || !count) {
                console.log('Preloading data...');
                preloadData(db).then(() => {
                    resolve();
                })
            }

            if (err) {
                console.error('Something went wrong accessing DB');
                reject(err);
            }
    
            resolve();
        });
    });
}

function server() {
    const db = setupDatabase();
    const app = express();
    app.use(express.static('public'))
    
    const port = PORT;

    if (!MAPS_API_KEY) {
        console.error('MAPS_API_KEY is not set, please check configuration file');
        process.exit(1);
    }

    return checkAndLoadDataIfNeeded(db)
        .then((docs) => {
            // Create endpoints
            // render client
            app.get('/', function(req, res) {
                return res.sendFile('public/index.html', { root: '../' })
            });

            // Returns client variables
            app.get('/client_vars', function(req, res) {
                return res.send({
                    locationVars: {
                        address: ADDRESS_FIELD_NAME,
                        name: NAME_FIELD_NAME,
                        website: WEBSITE_FIELD_NAME,
                    },
                    mapsVars: {
                        latLng: [parseFloat(LAT), parseFloat(LON)],
                        zoomLevel: parseFloat(MAPS_ZOOM_LEVEL),
                    },
                    accessToken: MAPS_API_KEY,
                });
            });

            // Return locations JSON
            app.get('/locations', function(req, res) {
                db.find({ Naam: { $exists: true } }, function(err, docs) {
                    return res.send(docs);
                });
            });

            // Force refresh of locations data
            app.get('/force_refresh', function(req, res) {
                return checkAndLoadDataIfNeeded(db, true)
                    .then(() => {
                        db.find({ Naam: { $exists: true } }, function(err, docs) {
                            return res.send(JSON.stringify({
                                status: true,
                                message: `${docs.length} locations were updated`,
                            })); 
                        });
                    })
                    .catch(() => {
                        return res.send(JSON.stringify({
                            status: false,
                            message: 'Something went wrong updating the locations',
                        }));
                    })
            });

            app.listen(port, function() {
                console.log(`Locations app listening on port ${port}!`);
                console.log(`App can now be accessed at http://${os.hostname}:${port}`);
            });
        });

}

server();
