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
    },
    aircraftType: {
        type: String,
        default: ''
    },
    aircraftRegistration: {
        type: String,
        default: ''
    },
    cabinClass: {
        type: String,
        default: 'Economy'
    },
    bookingRef: {
        type: String,
        required: true
    },
    baggage: {
        type: String,
        default: 'CABIN'
    },
    specialTags: {
        type: [String],
        default: []
    },
    manifestNotes: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
