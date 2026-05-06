// Fournit les fonctions utilitaires de chiffrement/dechiffrement Vigenere pour les indices.
/**
 * Chiffrement de VigenÃ¨re
 * @param {string} key  - La clÃ© de chiffrement (ex: "DEPARTEMENT94")
 * @param {string} text - Le texte Ã  chiffrer (ex: "ORY")
 * @returns {string}    - Le texte chiffrÃ©
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
            result += text[i]; // caractÃ¨re non alphabÃ©tique, on garde tel quel
            continue;
        }
        const keyPos = alphabet.indexOf(key[keyIndex % key.length]);
        result += alphabet[(charPos + keyPos) % 26];
        keyIndex++;
    }

    return result;
};

/**
 * DÃ©chiffrement de VigenÃ¨re
 * @param {string} key  - La clÃ© de dÃ©chiffrement
 * @param {string} text - Le texte chiffrÃ©
 * @returns {string}    - Le texte dÃ©chiffrÃ©
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

