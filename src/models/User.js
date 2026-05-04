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
    },
    seeded: {
        type: Boolean,
        default: false
    },
    progress: {
        loggedIn:      { type: Boolean, default: false },
        xssDone:       { type: Boolean, default: false },
        nosqlDone:     { type: Boolean, default: false },
        logsAccessed:  { type: Boolean, default: false },
        flagFound:     { type: Boolean, default: false },
        firstLoginAt:  { type: Date,    default: null  },
        flagFoundAt:   { type: Date,    default: null  }
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
