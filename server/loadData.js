const axios = require('axios');
const parse = require('csv-parse')
const dotenv = require('dotenv');
dotenv.config();
const {
    ADDRESS_FIELD_NAME,
    EXTERNAL_CSV_FILE,
    TOMTOM_API_KEY,
    COUNTRY,
    LAT,
    LON,
} = process.env;

// Credits https://www.webdeveloper.com/d/77256-strip-double-quotes-of-beginning-and-end-of-string/2
function unquoteString(string) {
    return string.replace (/(^')|('$)/g, '');
}

// Tries to decode the fetched CSV and returns the result
function parseCSV(data) {
    const output = [];
    const parser = parse({ columns: true });
    return new Promise((resolve, reject) => {
        // Use the readable stream api
        parser.on('readable', function() {
            let record;
            while (record = parser.read()) {
                output.push(record);
            }
        });

        // Catch any error
        parser.on('error', function(err) {
            console.error(err.message);
            reject();
        });

        parser.on('end', () => {
            resolve(output);
        });

        parser.write(data);
        parser.end();
    });
}

// Fetches the data from provided external CSV file and parses it
function loadCSVfile() {
    return axios.get(EXTERNAL_CSV_FILE)
        .then((res) => {
            // In my case, the columns are located on the second line of the file
            // so I split the file per line and fetch the second line, and split by column
            const data = res.data.split('\n').slice(1).join('\n');
            return parseCSV(data);
        })
        .catch(e => {
            console.log('e', e);
        })
}

// Additional override function for german addresses
// to help tom tom find our locations
function replaceAddressContent(address) {
    return address
        .toLowerCase()
        .replace('str.', 'strasse')
        .replace('Str.', 'Straße') 
}

function geoCodeAddresses(locationsData) {
    const url = `https://api.tomtom.com/search/2/batch/sync.json?key=${TOMTOM_API_KEY}`;
    const batchItems = locationsData.map((l) => {
        const address = encodeURIComponent(
            replaceAddressContent(
                l[ADDRESS_FIELD_NAME]
            )
        );
        return {
            query: `/geocode/${address}.json?countrySet=${COUNTRY}&lat=${LAT}&lon=${LON}`,
        };
    });

    return axios.post(url, {
        batchItems,
    })
    .then(res => res.data)
    .then(({ batchItems }) => {
        return batchItems.reduce((acc, { statusCode, response: { results } }, index) => {
            if (statusCode === 200 && results.length) {
                const match = results.find(i => i.type === 'Point Address') ||
                    results.find(i => i.type === 'Address Range') ||
                    results.find(i => i.type === 'Street');

                if (match) {
                    acc[index] = {
                        ...acc[index],
                        position: match.position,
                        score: match.score,
                        type: match.type,
                    };
                }
            }
            return acc;
        }, locationsData);
    }).catch((res) => {
        console.error(`Something went wrong with the lookup request for url: ${url} `);
        console.error(res.error);
    });
}

function preloadData(db) {
    if (!EXTERNAL_CSV_FILE) {
        console.error('EXTERNAL_CSV_FILE is not set, please check configuration file');
        process.exit(1);
    }

    if (!TOMTOM_API_KEY) {
        console.error('TOMTOM_API_KEY is not set, please check configuration file');
        process.exit(1);
    }

    return loadCSVfile().then(locationsData => {
        return geoCodeAddresses(locationsData);
    })
    .then(locationsWithPosition => {
        locationsWithPosition.forEach((l, id) => {
            // locations 
            db.update({ id }, { ...l, id }, { upsert: true });
        });
    });
};

module.exports = {
    preloadData,
};