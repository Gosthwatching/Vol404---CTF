require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../src/models/User');
const Ticket = require('../src/models/Billet');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vol404';

// Hash simple SHA256 
const hashPassword = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex');

const seed = async () => {
    await mongoose.connect(MONGO_URI);
    console.log('Connecté à MongoDB');

    // Nettoyage
    await User.deleteMany({});
    await Ticket.deleteMany({});
    console.log('Collections vidées');

    // Création des users
    const admin = await User.create({
        username: 'alice',
        password: hashPassword('4ir france2026'),
        role: 'admin'
    });

    const player = await User.create({
        username: 'Zorrow',
        password: hashPassword('password123'),
        role: 'player'
    });

    console.log('Users créés :', admin.username, '/', player.username);

    // Génération du token QR (aléatoire)
    const qrToken = crypto.randomBytes(16).toString('hex');

    // Billet de l'admin (alice)
    await Ticket.create({
        userId: admin._id,
        passengerName: 'Alice Collins',
        flightCode: 'AF404',
        seat: '13A',
        gate: 'B7',
        destination: 'Destination chiffrée',   // affiché côté gate
        qrToken: qrToken,
        departureTime: '14:35'
    });

    console.log('Billet créé pour alice');
    console.log('QR Token :', qrToken);
    console.log(`URL gate : http://localhost:3000/gate/${qrToken}`);

    await mongoose.disconnect();
    console.log('Seed terminé.');
};

seed().catch(err => {
    console.error('Erreur seed :', err);
    process.exit(1);
});
