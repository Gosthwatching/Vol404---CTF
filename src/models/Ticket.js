const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    passengerName: {
        type: String,
        required: true
    },
    flightCode: {
        type: String,
        required: true
    },
    seat: {
        type: String,
        required: true
    },
    gate: {
        type: String,
        required: true
    },
    destination: {
        type: String,
        required: true
    },
    qrToken: {
        type: String,
        required: true,
        unique: true
    },
    departureTime: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
