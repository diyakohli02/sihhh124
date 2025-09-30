const mongoose = require('mongoose');
const { Schema } = mongoose;

const assessmentSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    location: {
        type: String,
        required: true
    },
    roofArea: {
        type: Number,
        required: true,
        min: 0
    },
    roofType: {
        type: String,
        required: true,
        enum: ['rcc', 'metal', 'tile', 'asbestos', 'other']
    },
    buildingType: String,
    numberOfOccupants: Number,
    openSpace: {
        type: Number,
        required: true,
        min: 0
    },
    existingWell: {
        type: String,
        required: true,
        enum: ['none', 'borewell', 'openwell', 'both']
    },
    soilType: String,
    dailyWaterUsage: Number,
    purpose: {
        type: String,
        required: true,
        enum: ['storage', 'recharge', 'both', 'consultation']
    },
    budgetRange: String
}, { timestamps: true });

const Assessment = mongoose.model('Assessment', assessmentSchema);
module.exports = Assessment;