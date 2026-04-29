const mongoose = require('mongoose');
const { getMongoConnectionCandidates } = require('./mongoConnection');

const connectDB = async () => {
    try {
        // Keep NoSQL operator payloads functional for the CTF lab scenario.
        mongoose.set('sanitizeFilter', false);
        console.log('✓ Mongoose sanitizeFilter disabled - NoSQL payloads allowed');

        const mongoCandidates = getMongoConnectionCandidates();

        if (!mongoCandidates.length) {
            throw new Error('MONGO_URI manquant dans .env');
        }

        let lastError = null;

        for (const mongoUri of mongoCandidates) {
            try {
                await mongoose.connect(mongoUri);
                console.log('MongoDB connecté :', mongoUri);
                return;
            } catch (err) {
                lastError = err;
            }
        }

        throw lastError;
    } catch (err) {
        console.error('Erreur connexion MongoDB :', err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
