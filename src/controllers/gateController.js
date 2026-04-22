const Ticket = require('../models/Billet');
const { vigenereEncode } = require('../utils/vigenere');

// GET /gate/:token
const getGate = async (req, res) => {
    const { token } = req.params;
    const ticket = await Ticket.findOne({ qrToken: token });

    if (!ticket) {
        return res.status(404).json({ error: 'Gate introuvable ou token invalide.' });
    }

    const secret = "DEPARTEMENT92";
    const encoded = vigenereEncode(secret, "ORY");

    return res.json({
        gate: ticket.gate,
        flightCode: ticket.flightCode,
        message: encoded,
        hint: "QTH Locator : JN03EL",
        indice: "La clé survole la banlieue parisienne..."
    });
};

module.exports = { getGate };