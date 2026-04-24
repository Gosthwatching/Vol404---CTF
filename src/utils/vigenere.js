/**
 * Chiffrement de Vigenère
 * @param {string} key  - La clé de chiffrement (ex: "DEPARTEMENT94")
 * @param {string} text - Le texte à chiffrer (ex: "ORY")
 * @returns {string}    - Le texte chiffré
 */
const vigenereEncode = (key, text) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    text = text.toUpperCase();
    key  = key.toUpperCase().replace(/[^A-Z]/g, '');

    let result = '';
    let keyIndex = 0;

    for (let i = 0; i < text.length; i++) {
        const charPos = alphabet.indexOf(text[i]);
        if (charPos === -1) {
            result += text[i]; // caractère non alphabétique, on garde tel quel
            continue;
        }
        const keyPos = alphabet.indexOf(key[keyIndex % key.length]);
        result += alphabet[(charPos + keyPos) % 26];
        keyIndex++;
    }

    return result;
};

/**
 * Déchiffrement de Vigenère
 * @param {string} key  - La clé de déchiffrement
 * @param {string} text - Le texte chiffré
 * @returns {string}    - Le texte déchiffré
 */
const vigenereDecode = (key, text) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    text = text.toUpperCase();
    key  = key.toUpperCase().replace(/[^A-Z]/g, '');

    let result = '';
    let keyIndex = 0;

    for (let i = 0; i < text.length; i++) {
        const charPos = alphabet.indexOf(text[i]);
        if (charPos === -1) {
            result += text[i];
            continue;
        }
        const keyPos = alphabet.indexOf(key[keyIndex % key.length]);
        result += alphabet[(charPos - keyPos + 26) % 26];
        keyIndex++;
    }

    return result;
};

module.exports = { vigenereEncode, vigenereDecode };
