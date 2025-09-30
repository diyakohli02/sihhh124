const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the nested schema for a single cost tier (used inside costTiers)
const CostTierSchema = new Schema({
    label: String,
    cost: Number,
    structure: String,
});

const reportSchema = new Schema({
    assessmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Assessment',
        required: true
    },
    overallFeasibilityScore: String,
    annualHarvestableWaterLiters: Number,
    recommendedStructure: String,
    estimatedPaybackPeriodYears: Number,
    
    // --- NEW FIELD ADDED TO SCHEMA ---
    costTiers: {
        basic: CostTierSchema,
        standard: CostTierSchema,
        premium: CostTierSchema,
    },
    // --- END NEW FIELD ---

    projectCostEstimate: {
        min: Number,
        max: Number
    },
    hydrogeologicalProfile: {
        localRainfall_mm: Number,
        soilType: String,
        principalAquifer: String,
        groundwaterDepth_meters: Number
    },
    // Add scenarios property if you also store chart data in the database
    scenarios: Object, 

}, { timestamps: true });

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;