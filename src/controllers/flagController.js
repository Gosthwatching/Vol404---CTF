const airports = {
    94: "ORY",   // Val-de-Marne → Paris-Orly
    13: "MRS",   // Marseille
    69: "LYS",   // Lyon
    75: "CDG",   // Paris CDG
    31: "TLS",   // Toulouse
    67: "SXB"    // Strasbourg
};

// POST /flag
const checkFlag = (req, res) => {
    const dep = parseInt(req.body.code);

    if (!dep || !airports[dep]) {
        return res.status(400).json({ error: "Mauvaise réponse." });
    }

    return res.json({ flag: `CTF{${airports[dep]}_boarding_complete}` });
};

module.exports = { checkFlag };
