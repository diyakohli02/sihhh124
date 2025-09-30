// config/constants.js

// --- HYDROLOGICAL CONSTANTS ---
exports.RUNOFF_COEFFICIENTS = {
    rcc: 0.90,       // Reinforced Cement Concrete (RCC)
    metal: 0.85,     // Metal Sheet
    tile: 0.75,      // Clay/Concrete Tiles
    asbestos: 0.65,  // Asbestos Sheet
    other: 0.60      // Default for unknown materials
};

// --- RAINFALL DEFAULTS ---
exports.DEFAULT_ANNUAL_RAINFALL = 850; // mm/year - Used when API fails or location not found

// --- GROUNDWATER DEFAULTS ---
exports.DEFAULT_GROUNDWATER_DEPTH = 20; // meters
exports.DEFAULT_AQUIFER_TYPE = 'Deep Alluvial Aquifer';

// --- FEASIBILITY THRESHOLDS ---
exports.FEASIBILITY_THRESHOLDS = {
    HIGHLY_SUITABLE: 150000, // Liters - Threshold for "HIGHLY SUITABLE" rating
    MODERATELY_SUITABLE: 50000 // Liters - Threshold for "MODERATELY SUITABLE" rating
};

// --- API TIMEOUTS ---
exports.API_TIMEOUT = 5000; // ms - Timeout for external API calls

// --- MULTILINGUAL SUPPORT ---
exports.SUPPORTED_LANGUAGES = ['en', 'hi'];

exports.TRANSLATIONS = {
    en: {
        report: {
            title: 'JAL SANRAKSHAN: Your Personalized Water Security Report',
            subtitle: 'Empowering You to Harvest Every Drop',
            sections: {
                executiveSummary: 'Executive Summary',
                siteAssessment: 'Site Assessment',
                harvestingPotential: 'Harvesting Potential',
                hydroProfile: 'Hydrogeological Profile',
                structure: 'Recommended Structure & Design',
                limitations: 'Limitations & Assumptions'
            },
            disclaimers: {
                dataSource: 'Data is based on open-source rainfall APIs and user-provided values.',
                validation: 'Ground validation by qualified professionals is recommended.',
                assumptions: 'Calculations assume typical conditions and may vary based on local factors.'
            }
        }
    },
    hi: {
        report: {
            title: 'जल संरक्षण: आपकी व्यक्तिगत जल सुरक्षा रिपोर्ट',
            subtitle: 'हर बूंद का संरक्षण सशक्त बनाए',
            sections: {
                executiveSummary: 'कार्यकारी सारांश',
                siteAssessment: 'साइट मूल्यांकन',
                harvestingPotential: 'जल संचयन क्षमता',
                hydroProfile: 'हाइड्रोजियोलॉजिकल प्रोफ़ाइल',
                structure: 'अनुशंसित संरचना और डिज़ाइन',
                limitations: 'सीमाएं और मान्यताएं'
            },
            disclaimers: {
                dataSource: 'डेटा ओपन-सोर्स वर्षा API और उपयोगकर्ता-प्रदत्त मूल्यों पर आधारित है।',
                validation: 'योग्य पेशेवरों द्वारा भूमि सत्यापन की सिफारिश की जाती है।',
                assumptions: 'गणनाएं सामान्य परिस्थितियों पर आधारित हैं और स्थानीय कारकों के आधार पर भिन्न हो सकती हैं।'
            }
        }
    }
};