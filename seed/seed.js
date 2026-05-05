const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../src/models/User');
const Ticket = require('../src/models/Billet');
const { getMongoConnectionCandidates } = require('../src/config/mongoConnection');

const MONGO_URI = process.env.MONGO_URI;
const ALICE_MANIFEST_CODE = 'AF404';

// Hash simple SHA256 
const hashPassword = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex');

const buildBookingRef = (flightCode, manifestIndex) => {
    return `${flightCode}-${String(manifestIndex + 1).padStart(3, '0')}`;
};

const flightManifests = require('./data/flights.json');

const aircraftSeatLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

const buildSeatNumber = (index) => {
    const row = Math.floor(index / aircraftSeatLetters.length) + 1;
    const letter = aircraftSeatLetters[index % aircraftSeatLetters.length];
    return `${row}${letter}`;
};

const getCabinClassFromSeat = (seat) => {
    const row = Number.parseInt(seat, 10);

    if (row <= 3) {
        return 'Business';
    }

    if (row <= 8) {
        return 'Premium Economy';
    }

    return 'Economy';
};

const specialProfiles = require('./data/specialProfiles.json');

const buildAutoTravelerTags = (index) => {
    const tags = [];

    if (index % 9 === 0) tags.push('PRIO');
    if (index % 14 === 0) tags.push('VGML');
    if (index % 19 === 0) tags.push('PETC');

    return tags;
};

const buildAutoTravelerNote = (tags) => {
    if (!tags.length) return '';

    if (tags.includes('PETC')) return 'Bagage cabine adapte transport animal confirme.';
    if (tags.includes('VGML')) return 'Repas special confirme au catering.';
    if (tags.includes('PRIO')) return 'Priorite embarquement active au dossier.';

    return '';
};

const buildManifestDetails = (passenger, manifest, manifestIndex, globalIndex) => {
    const baseSeat = passenger.seat || buildSeatNumber(manifestIndex);
    const profileKey = typeof passenger.profileKey === 'string' ? passenger.profileKey : passenger.username;
    const override = profileKey ? specialProfiles[profileKey] : null;
    const seat = override?.seat || baseSeat;
    const cabinClass = override?.cabinClass || getCabinClassFromSeat(seat);
    const baggage = cabinClass === 'Business' ? '2PC HOLD + CABIN' : cabinClass === 'Premium Economy' ? '1PC HOLD + CABIN' : globalIndex % 4 === 0 ? 'CABIN ONLY' : '1PC HOLD + CABIN';
    const autoTags = buildAutoTravelerTags(globalIndex);
    const profile = {
        flightCode: manifest.flightCode,
        destination: manifest.destination,
        seat,
        gate: passenger.gate || manifest.gate,
        departureTime: passenger.time || manifest.departureTime,
        aircraftType: manifest.aircraftType,
        aircraftRegistration: manifest.aircraftRegistration,
        cabinClass,
        bookingRef: buildBookingRef(manifest.flightCode, manifestIndex),
        baggage,
        specialTags: autoTags,
        manifestNotes: buildAutoTravelerNote(autoTags)
    };

    if (override) {
        const mergedTags = [...new Set([...(profile.specialTags || []), ...(override.specialTags || [])])];
        return {
            ...profile,
            ...override,
            specialTags: mergedTags
        };
    }

    return profile;
};

const fakePassengers = require('./data/passengers/AF404.json');

const orderedPassengers = (() => {
    const list = [...fakePassengers];
    const aliceIndex = list.findIndex((passenger) => passenger.username === 'alice');

    if (aliceIndex === -1) {
        return list;
    }

    const [alicePassenger] = list.splice(aliceIndex, 1);
    list.push(alicePassenger);
    return list;
})();

const passengersAF1548 = require('./data/passengers/AF1548.json');

const passengersAF1219 = require('./data/passengers/AF1219.json');

const passengersAF1832 = require('./data/passengers/AF1832.json');

const passengersAF1024 = require('./data/passengers/AF1024.json');

// Chaque manifest a ses 100 passagers uniques. AF404 garde les passagers originaux (avec Alice).
const manifestPassengersMap = {
    'AF404':  orderedPassengers,
    'AF1548': passengersAF1548,
    'AF1219': passengersAF1219,
    'AF1832': passengersAF1832,
    'AF1024': passengersAF1024
};

const seed = async () => {
    const shouldReset = process.argv.includes('--reset');

    if (!MONGO_URI) {
        throw new Error('MONGO_URI manquant. Verifie le fichier .env a la racine du projet.');
    }

    const candidates = getMongoConnectionCandidates(MONGO_URI);
    let connected = false;
    let lastError = null;

    for (const candidate of candidates) {
        try {
            await mongoose.connect(candidate);
            connected = true;
            console.log(`Connexion seed via URI: ${candidate}`);
            break;
        } catch (err) {
            lastError = err;
        }
    }

    if (!connected) {
        throw lastError;
    }

    console.log('Connecté à MongoDB');

    if (shouldReset) {
        // Reset complet explicite
        await User.deleteMany({});
        await Ticket.deleteMany({});
        console.log('Collections vidées (mode reset).');
    } else {
        console.log('Mode seed non destructif: les comptes existants sont conservés.');
    }

    let totalSeeded = 0;

    for (const manifest of flightManifests) {
        const passengerList = manifestPassengersMap[manifest.flightCode];
        for (const [manifestIndex, basePassenger] of passengerList.entries()) {
            const isAlice = basePassenger.username === 'alice';

            const seededPassenger = {
                ...basePassenger,
                username: isAlice ? 'alice' : `${basePassenger.username}_${manifest.flightCode.toLowerCase()}`,
                profileKey: basePassenger.username
            };

            const manifestDetails = buildManifestDetails(seededPassenger, manifest, manifestIndex, totalSeeded);
            // Alice gets a fresh random password on each seed so the intended CTF path stays injection-based.
            const clearPassword = isAlice ? crypto.randomBytes(16).toString('hex') : basePassenger.password;
            const user = await User.findOneAndUpdate(
                { username: seededPassenger.username },
                {
                    $set: {
                        password: hashPassword(clearPassword),
                        passwordClear: clearPassword,
                        role: isAlice ? 'admin' : 'player',
                        seeded: true
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            const qrToken = crypto.randomBytes(16).toString('hex');

            await Ticket.findOneAndUpdate(
                { userId: user._id },
                {
                    $set: {
                        passengerName: basePassenger.name,
                        flightCode: manifestDetails.flightCode,
                        seat: manifestDetails.seat,
                        gate: manifestDetails.gate,
                        destination: isAlice ? 'Destination chiffree' : manifestDetails.destination,
                        qrToken: qrToken,
                        departureTime: manifestDetails.departureTime,
                        aircraftType: manifestDetails.aircraftType,
                        aircraftRegistration: manifestDetails.aircraftRegistration,
                        cabinClass: manifestDetails.cabinClass,
                        bookingRef: manifestDetails.bookingRef,
                        baggage: manifestDetails.baggage,
                        specialTags: manifestDetails.specialTags,
                        manifestNotes: manifestDetails.manifestNotes
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            if (isAlice) {
                console.log(`[ALICE] QR Token : ${qrToken}`);
                console.log(`[ALICE] URL gate : http://localhost:3000/gate/${qrToken}`);
            }

            totalSeeded += 1;
        }
    }

    console.log(`${totalSeeded} passagers seedés (${orderedPassengers.length} par manifest).`);
    await mongoose.disconnect();
    console.log('Seed terminé.');
};

seed().catch(err => {
    console.error('Erreur seed :', err);
    process.exit(1);
});
