require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../src/models/User');
const Ticket = require('../src/models/Billet');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vol404';

// Hash simple SHA256 
const hashPassword = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex');

// 100 passagers — alice cachée en position 42
const fakePassengers = [
    { username: 'marco_v',     password: 'summer2024',    name: 'Marco Ventura',      seat: '1A',  gate: 'A1', time: '07:00' },
    { username: 'lena_k',      password: 'hello123',      name: 'Lena Kowalski',      seat: '1B',  gate: 'A1', time: '07:05' },
    { username: 'raj_p',       password: 'iloveyou',      name: 'Raj Patel',          seat: '1C',  gate: 'A1', time: '07:10' },
    { username: 'sofia_m',     password: 'qwerty99',      name: 'Sofia Martinez',     seat: '2A',  gate: 'A1', time: '07:15' },
    { username: 'tom_b',       password: 'abc12345',      name: 'Thomas Bernard',     seat: '2B',  gate: 'A1', time: '07:20' },
    { username: 'nadia_r',     password: 'sunshine7',     name: 'Nadia Rousseau',     seat: '2C',  gate: 'A2', time: '07:25' },
    { username: 'kevin_l',     password: 'dragon2023',    name: 'Kevin Laurent',      seat: '3A',  gate: 'A2', time: '07:30' },
    { username: 'hugo_d',      password: 'monkey123',     name: 'Hugo Dubois',        seat: '3B',  gate: 'A2', time: '07:35' },
    { username: 'camille_f',   password: 'letmein9',      name: 'Camille Fontaine',   seat: '3C',  gate: 'A2', time: '07:40' },
    { username: 'pierre_g',    password: 'football1',     name: 'Pierre Garnier',     seat: '4A',  gate: 'A2', time: '07:45' },
    { username: 'emma_w',      password: 'princess44',    name: 'Emma Weber',         seat: '4B',  gate: 'A2', time: '07:50' },
    { username: 'yann_t',      password: 'master99',      name: 'Yann Torres',        seat: '4C',  gate: 'A3', time: '07:55' },
    { username: 'clara_b',     password: 'orange2025',    name: 'Clara Bouchard',     seat: '5A',  gate: 'A3', time: '08:00' },
    { username: 'felix_m',     password: 'batman55',      name: 'Felix Morin',        seat: '5B',  gate: 'A3', time: '08:05' },
    { username: 'julie_n',     password: 'sunshine1',     name: 'Julie Normand',      seat: '5C',  gate: 'A3', time: '08:10' },
    { username: 'ethan_c',     password: 'cookie99',      name: 'Ethan Clement',      seat: '6A',  gate: 'A3', time: '08:15' },
    { username: 'manon_d',     password: 'flower22',      name: 'Manon Dupuis',       seat: '6B',  gate: 'A4', time: '08:20' },
    { username: 'lucas_b',     password: 'rocky007',      name: 'Lucas Blanc',        seat: '6C',  gate: 'A4', time: '08:25' },
    { username: 'sarah_k',     password: 'tigger88',      name: 'Sarah Klein',        seat: '7A',  gate: 'A4', time: '08:30' },
    { username: 'david_r',     password: 'mustang5',      name: 'David Renard',       seat: '7B',  gate: 'A4', time: '08:35' },
    { username: 'ines_p',      password: 'bubble33',      name: 'Ines Petit',         seat: '7C',  gate: 'A4', time: '08:40' },
    { username: 'theo_m',      password: 'thunder7',      name: 'Theo Martin',        seat: '8A',  gate: 'A5', time: '08:45' },
    { username: 'zoe_l',       password: 'maple2023',     name: 'Zoe Lefebvre',       seat: '8B',  gate: 'A5', time: '08:50' },
    { username: 'axel_f',      password: 'silver66',      name: 'Axel Ferrari',       seat: '8C',  gate: 'A5', time: '08:55' },
    { username: 'marie_v',     password: 'cherry12',      name: 'Marie Vidal',        seat: '9A',  gate: 'A5', time: '09:00' },
    { username: 'romain_c',    password: 'soccer55',      name: 'Romain Caron',       seat: '9B',  gate: 'A5', time: '09:05' },
    { username: 'lea_s',       password: 'winter88',      name: 'Lea Simon',          seat: '9C',  gate: 'A6', time: '09:10' },
    { username: 'paul_d',      password: 'blaze44',       name: 'Paul Dumont',        seat: '10A', gate: 'A6', time: '09:15' },
    { username: 'chloe_b',     password: 'tulip22',       name: 'Chloe Bernard',      seat: '10B', gate: 'A6', time: '09:20' },
    { username: 'max_r',       password: 'ranger9',       name: 'Max Roussel',        seat: '10C', gate: 'A6', time: '09:25' },
    { username: 'lou_p',       password: 'panda77',       name: 'Lou Perrin',         seat: '11A', gate: 'A6', time: '09:30' },
    { username: 'gabriel_m',   password: 'pixel111',      name: 'Gabriel Mercier',    seat: '11B', gate: 'A7', time: '09:35' },
    { username: 'anna_k',      password: 'spark44',       name: 'Anna Krause',        seat: '11C', gate: 'A7', time: '09:40' },
    { username: 'victor_l',    password: 'eagle33',       name: 'Victor Lebrun',      seat: '12A', gate: 'A7', time: '09:45' },
    { username: 'elise_c',     password: 'comet55',       name: 'Elise Chevalier',    seat: '12B', gate: 'A7', time: '09:50' },
    { username: 'oscar_t',     password: 'nova88',        name: 'Oscar Thuillier',    seat: '12C', gate: 'A7', time: '09:55' },
    { username: 'nina_b',      password: 'flash22',       name: 'Nina Bertrand',      seat: '13B', gate: 'A8', time: '10:00' },
    { username: 'simon_g',     password: 'bolt99',        name: 'Simon Gauthier',     seat: '13C', gate: 'A8', time: '10:05' },
    { username: 'lucie_h',     password: 'storm55',       name: 'Lucie Henry',        seat: '14A', gate: 'A8', time: '10:10' },
    { username: 'adam_n',      password: 'viper44',       name: 'Adam Noel',          seat: '14B', gate: 'A8', time: '10:15' },
    { username: 'jade_f',      password: 'cobra33',       name: 'Jade Faure',         seat: '14C', gate: 'A8', time: '10:20' },
    { username: '*****',       password: '***********',   name: 'Alice Collins',      seat: '13A', gate: 'B7', time: '14:35' },
    { username: 'robin_p',     password: 'ghost11',       name: 'Robin Perrot',       seat: '15A', gate: 'A9', time: '10:30' },
    { username: 'amelie_v',    password: 'blizzard2',     name: 'Amelie Vasseur',     seat: '15B', gate: 'A9', time: '10:35' },
    { username: 'baptiste_l',  password: 'crystal9',      name: 'Baptiste Leroy',     seat: '15C', gate: 'A9', time: '10:40' },
    { username: 'celia_m',     password: 'prism44',       name: 'Celia Michaud',      seat: '16A', gate: 'A9', time: '10:45' },
    { username: 'quentin_b',   password: 'pulse88',       name: 'Quentin Bonnet',     seat: '16B', gate: 'A9', time: '10:50' },
    { username: 'mathis_d',    password: 'neon22',        name: 'Mathis Dufour',      seat: '16C', gate: 'B1', time: '10:55' },
    { username: 'lola_r',      password: 'laser55',       name: 'Lola Richard',       seat: '17A', gate: 'B1', time: '11:00' },
    { username: 'antoine_c',   password: 'wave33',        name: 'Antoine Colin',      seat: '17B', gate: 'B1', time: '11:05' },
    { username: 'pauline_g',   password: 'tide77',        name: 'Pauline Gerard',     seat: '17C', gate: 'B1', time: '11:10' },
    { username: 'florian_m',   password: 'river99',       name: 'Florian Muller',     seat: '18A', gate: 'B1', time: '11:15' },
    { username: 'elodie_p',    password: 'cloud44',       name: 'Elodie Pons',        seat: '18B', gate: 'B2', time: '11:20' },
    { username: 'thibault_l',  password: 'mist22',        name: 'Thibault Laurent',   seat: '18C', gate: 'B2', time: '11:25' },
    { username: 'coralie_d',   password: 'frost88',       name: 'Coralie Dupont',     seat: '19A', gate: 'B2', time: '11:30' },
    { username: 'nicolas_r',   password: 'hail55',        name: 'Nicolas Renaud',     seat: '19B', gate: 'B2', time: '11:35' },
    { username: 'margot_b',    password: 'snow33',        name: 'Margot Blanc',       seat: '19C', gate: 'B2', time: '11:40' },
    { username: 'alexis_c',    password: 'sleet11',       name: 'Alexis Chapuis',     seat: '20A', gate: 'B3', time: '11:45' },
    { username: 'oceane_m',    password: 'wind66',        name: 'Oceane Morel',       seat: '20B', gate: 'B3', time: '11:50' },
    { username: 'Zorrow',      password: 'password123',   name: 'Zorrow X',           seat: '20C', gate: 'B3', time: '11:55' },
    { username: 'charline_f',  password: 'gale44',        name: 'Charline Favre',     seat: '21A', gate: 'B3', time: '12:00' },
    { username: 'jeremy_v',    password: 'gust22',        name: 'Jeremy Verdier',     seat: '21B', gate: 'B3', time: '12:05' },
    { username: 'ophelie_t',   password: 'rain77',        name: 'Ophelie Thomas',     seat: '21C', gate: 'B4', time: '12:10' },
    { username: 'sebastien_l', password: 'drizzle9',      name: 'Sebastien Lacombe',  seat: '22A', gate: 'B4', time: '12:15' },
    { username: 'doriane_p',   password: 'thunder44',     name: 'Doriane Paget',      seat: '22B', gate: 'B4', time: '12:20' },
    { username: 'tristan_c',   password: 'lightning5',    name: 'Tristan Carlier',    seat: '22C', gate: 'B4', time: '12:25' },
    { username: 'laetitia_m',  password: 'echo88',        name: 'Laetitia Masson',    seat: '23A', gate: 'B4', time: '12:30' },
    { username: 'helene_r',    password: 'foxtrot2',      name: 'Helene Rolland',     seat: '23B', gate: 'B5', time: '12:35' },
    { username: 'cyril_d',     password: 'golf55',        name: 'Cyril Denis',        seat: '23C', gate: 'B5', time: '12:40' },
    { username: 'aurelie_g',   password: 'hotel33',       name: 'Aurelie Guerin',     seat: '24A', gate: 'B5', time: '12:45' },
    { username: 'stephane_m',  password: 'india77',       name: 'Stephane Moulin',    seat: '24B', gate: 'B5', time: '12:50' },
    { username: 'vanessa_l',   password: 'juliet44',      name: 'Vanessa Lemaire',    seat: '24C', gate: 'B5', time: '12:55' },
    { username: 'xavier_p',    password: 'kilo22',        name: 'Xavier Poirier',     seat: '25A', gate: 'B6', time: '13:00' },
    { username: 'wendy_c',     password: 'lima99',        name: 'Wendy Castillo',     seat: '25B', gate: 'B6', time: '13:05' },
    { username: 'ugo_b',       password: 'mike55',        name: 'Ugo Breton',         seat: '25C', gate: 'B6', time: '13:10' },
    { username: 'tania_r',     password: 'november3',     name: 'Tania Renaud',       seat: '26A', gate: 'B6', time: '13:15' },
    { username: 'steve_m',     password: 'oscar44',       name: 'Steve Moreau',       seat: '26B', gate: 'B6', time: '13:20' },
    { username: 'rachel_f',    password: 'papa88',        name: 'Rachel Fontaine',    seat: '26C', gate: 'B7', time: '13:25' },
    { username: 'quentin3_v',  password: 'quebec22',      name: 'Quentin Voisin',     seat: '27A', gate: 'B7', time: '13:30' },
    { username: 'priya_s',     password: 'romeo55',       name: 'Priya Singh',        seat: '27B', gate: 'B7', time: '13:35' },
    { username: 'omar_k',      password: 'sierra33',      name: 'Omar Khalil',        seat: '27C', gate: 'B7', time: '13:40' },
    { username: 'noemi_b',     password: 'tango77',       name: 'Noemi Bertrand',     seat: '28A', gate: 'B8', time: '13:45' },
    { username: 'mathieu_c',   password: 'uniform9',      name: 'Mathieu Collet',     seat: '28B', gate: 'B8', time: '13:50' },
    { username: 'leslie_p',    password: 'victor44',      name: 'Leslie Petit',       seat: '28C', gate: 'B8', time: '13:55' },
    { username: 'kevin2_r',    password: 'whiskey2',      name: 'Kevin Roux',         seat: '29A', gate: 'B8', time: '14:00' },
    { username: 'jessica_m',   password: 'xray55',        name: 'Jessica Marty',      seat: '29B', gate: 'B8', time: '14:05' },
    { username: 'ibrahim_d',   password: 'yankee33',      name: 'Ibrahim Diallo',     seat: '29C', gate: 'B9', time: '14:10' },
    { username: 'flora_v',     password: 'zulu88',        name: 'Flora Vincent',      seat: '30A', gate: 'B9', time: '14:15' },
    { username: 'edouard_l',   password: 'alpha11',       name: 'Edouard Leclerc',    seat: '30B', gate: 'B9', time: '14:20' },
    { username: 'delphine_g',  password: 'bravo44',       name: 'Delphine Guillet',   seat: '30C', gate: 'B9', time: '14:25' },
    { username: 'clement_b',   password: 'charlie9',      name: 'Clement Blanchard',  seat: '31A', gate: 'B9', time: '14:30' },
    { username: 'beatrice_r',  password: 'delta77',       name: 'Beatrice Renard',    seat: '31B', gate: 'C1', time: '14:40' },
    { username: 'arnaud_p',    password: 'foxtrot88',     name: 'Arnaud Prevost',     seat: '31C', gate: 'C1', time: '14:45' },
    { username: 'agathe_m',    password: 'golf22',        name: 'Agathe Millet',      seat: '32A', gate: 'C1', time: '14:50' },
    { username: 'boris_c',     password: 'hotel55',       name: 'Boris Collin',       seat: '32B', gate: 'C1', time: '14:55' },
    { username: 'cecile_n',    password: 'india33',       name: 'Cecile Noel',        seat: '32C', gate: 'C1', time: '15:00' },
    { username: 'dimitri_v',   password: 'juliet88',      name: 'Dimitri Vallet',     seat: '33A', gate: 'C2', time: '15:05' },
    { username: 'estelle_r',   password: 'kilo44',        name: 'Estelle Remy',       seat: '33B', gate: 'C2', time: '15:10' },
    { username: 'francois_b',  password: 'lima22',        name: 'Francois Baudry',    seat: '33C', gate: 'C2', time: '15:15' },
];

const seed = async () => {
    await mongoose.connect(MONGO_URI);
    console.log('Connecté à MongoDB');

    // Nettoyage
    await User.deleteMany({});
    await Ticket.deleteMany({});
    console.log('Collections vidées');

    for (const p of fakePassengers) {
        const isAlice = p.username === 'alice';
        const user = await User.create({
            username: p.username,
            password: hashPassword(p.password),
            passwordClear: p.password,
            role: isAlice ? 'admin' : 'player'
        });

        const qrToken = crypto.randomBytes(16).toString('hex');

        await Ticket.create({
            userId: user._id,
            passengerName: p.name,
            flightCode: 'AF404',
            seat: p.seat,
            gate: p.gate,
            destination: isAlice ? 'Destination chiffrée' : 'Paris CDG',
            qrToken: qrToken,
            departureTime: p.time
        });

        if (isAlice) {
            console.log(`[ALICE] QR Token : ${qrToken}`);
            console.log(`[ALICE] URL gate : http://localhost:3000/gate/${qrToken}`);
        }
    }

    console.log(`${fakePassengers.length} passagers créés.`);
    await mongoose.disconnect();
    console.log('Seed terminé.');
};

seed().catch(err => {
    console.error('Erreur seed :', err);
    process.exit(1);
});
