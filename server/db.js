const Datastore = require('nedb');

function setupDatabase() {
    const db = new Datastore({ filename: '../dbData/dataFile.db' });
    
    db.loadDatabase(function (err) {
        if (err) {
            console.error('Error loading database');
            console.error(err);
        }
    });

    return db;
};

module.exports = {
    setupDatabase,
};