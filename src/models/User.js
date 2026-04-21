const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    passwordClear: {
        type: String,
        default: ''
    },
    role: {
        type: String,
        enum: ['admin', 'player'],
        default: 'player'
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
