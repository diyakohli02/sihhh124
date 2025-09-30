// utils/reportHelpers.js

const { RUNOFF_COEFFICIENTS, DEFAULT_ANNUAL_RAINFALL, DEFAULT_GROUNDWATER_DEPTH } = require('../config/constants');

/**
 * Get the runoff coefficient based on roof type
 * @param {string} roofType - Type of roof material
 * @returns {number} Runoff coefficient value
 */
exports.getRunoffCoefficient = (roofType) => {
    return RUNOFF_COEFFICIENTS[roofType] || RUNOFF_COEFFICIENTS.other;
};

/**
 * Format soil type for display
 * @param {string} soilType - Raw soil type value
 * @returns {string} Formatted soil type description
 */
exports.formatSoilType = (soilType) => {
    if (!soilType || soilType === 'unknown') return 'Unknown (Assumed Alluvial)';
    return soilType.charAt(0).toUpperCase() + soilType.slice(1) + ' (Infiltration potential varies)';
};

/**
 * Calculate harvestable water volume
 * @param {number} roofArea - Roof area in square meters
 * @param {string} roofType - Type of roof material
 * @param {number} rainfall - Annual rainfall in mm
 * @returns {number} Harvestable water volume in liters
 */
exports.calculateHarvestableWater = (roofArea, roofType, rainfall) => {
    const runoffCoefficient = exports.getRunoffCoefficient(roofType);
    return Math.round(roofArea * runoffCoefficient * rainfall);
};

/**
 * Get feasibility scenarios for different rainfall conditions
 * @param {number} baseRainfall - Current rainfall value
 * @param {number} roofArea - Roof area in square meters
 * @param {string} roofType - Type of roof material
 * @returns {Object} Low, current, and high scenario calculations
 */
exports.calculateScenarios = (baseRainfall, roofArea, roofType) => {
    const actualRainfall = baseRainfall || DEFAULT_ANNUAL_RAINFALL;
    const lowRainfall = Math.max(actualRainfall * 0.7, 500);
    const highRainfall = actualRainfall * 1.3;

    return {
        low: {
            rainfall: Math.round(lowRainfall),
            harvestable: exports.calculateHarvestableWater(roofArea, roofType, lowRainfall)
        },
        actual: {
            rainfall: Math.round(actualRainfall),
            harvestable: exports.calculateHarvestableWater(roofArea, roofType, actualRainfall)
        },
        high: {
            rainfall: Math.round(highRainfall),
            harvestable: exports.calculateHarvestableWater(roofArea, roofType, highRainfall)
        }
    };
};

/**
 * Get text for a specific language
 * @param {Object} translations - Translation object from constants
 * @param {string} lang - Language code
 * @param {string} key - Dot-notation path to translation
 * @returns {string} Translated text
 */
exports.getTranslatedText = (translations, lang, key) => {
    const keys = key.split('.');
    let result = translations[lang] || translations['en']; // Fallback to English
    
    for (const k of keys) {
        result = result?.[k];
        if (!result) break;
    }
    
    return result || translations.en[key] || key;
};