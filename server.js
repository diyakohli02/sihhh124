// server.js

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const cors = require('cors');
const ejs = require('ejs');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Add the node-fetch import
const fetch = require('node-fetch');

// Import your Mongoose models
const User = require('./models/user');
const Assessment = require('./models/assessment');
const Report = require('./models/report');

// Load environment variables
dotenv.config();

// --- HYDROLOGICAL CONSTANTS ---
const RUNOFF_COEFFICIENTS = {
    rcc: 0.90,       // Reinforced Cement Concrete (RCC)
    metal: 0.85,     // Metal Sheet
    tile: 0.75,      // Clay/Concrete Tiles
    asbestos: 0.65,  // Asbestos Sheet
    other: 0.60
};

// --- FINANCIAL CONSTANTS ---
const BASE_ANNUAL_SAVINGS = 18000; 
const DEFAULT_PROJECT_COST = 62500;
const FIXED_COST_TIERS = {
    basic: {
        label: 'Tier 1: Basic (Shallow Recharge/Small Storage)',
        cost: 60000, 
        structure: 'Simple Recharge Pit + First-Flush Filter',
    },
    standard: {
        label: 'Tier 2: Standard (Recommended)',
        cost: 150000, 
        structure: 'Recharge Shaft or Medium Cistern + Multi-Stage Filtration',
    },
    premium: {
        label: 'Tier 3: Premium (Max. Capacity/Deep Recharge)',
        cost: 300000, 
        structure: 'Advanced Recharge Shaft with Sump + Large Storage Tank',
    }
};
const TRANSLATIONS = { 
    en: {
        report: {
            title: "JAL SANRAKSHAN: Your Personalized Water Security Report",
            subtitle: "Empowering You to Harvest Every Drop",
            sections: { executiveSummary: "Executive Summary", limitations: "Report Limitations" },
            disclaimers: { dataSource: "Data derived from external APIs (IMD/OpenMeteo).", validation: "Technical validation requires an on-site inspection.", assumptions: "Financial projections based on estimated averages." }
        }
    }, 
    hi: {
        report: {
            title: "जल संरक्षण: आपकी व्यक्तिगत जल सुरक्षा रिपोर्ट",
            subtitle: "आपको हर बूँद सहेजने के लिए सशक्त बनाना",
            sections: { executiveSummary: "कार्यकारी सारांश", limitations: "रिपोर्ट सीमाएँ" },
            disclaimers: { dataSource: "डेटा बाहरी एपीआई (आईएमडी/ओपनमेटियो) से प्राप्त होता है।", validation: "तकनीकी सत्यापन के लिए साइट पर निरीक्षण आवश्यक है।", assumptions: "वित्तीय अनुमान अनुमानित औसत पर आधारित हैं।" }
        }
    } 
};
const DEFAULT_AQUIFER_TYPE = "Deep Alluvial Aquifer";
const DEFAULT_GROUNDWATER_DEPTH = 20;
// --- END CONSTANTS ---

// --- DYNAMIC RAINFALL FUNCTION (API IMPLEMENTATION) ---
async function getRainfallData(location) {
    const standardizedLocation = location.trim();
    const DEFAULT_RAINFALL = 850; 

    if (!standardizedLocation) {
        return DEFAULT_RAINFALL;
    }

    try {
        const geocodingUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(standardizedLocation)}&format=json&limit=1`;
        
        const geoResponse = await fetch(geocodingUrl, {
            headers: {
                'User-Agent': 'RWHGenius-App/1.0 (contact@yourdomain.com)'
            },
            timeout: 5000 
        });

        const geoData = await geoResponse.json();

        if (!geoData || geoData.length === 0) {
            console.warn(`Geocoding failed for: ${location}. Using default rainfall.`);
            return DEFAULT_RAINFALL;
        }

        const lat = geoData[0].lat;
        const lon = geoData[0].lon;
        
        const today = new Date();
        const yearBefore = today.getFullYear() - 1;
        
        const weatherUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${yearBefore}-01-01&end_date=${yearBefore}-12-31&daily=precipitation_sum&timezone=auto`;
        
        const weatherResponse = await fetch(weatherUrl, { timeout: 5000 });
        const weatherData = await weatherResponse.json();

        if (weatherData.error || !weatherData.daily || !weatherData.daily.precipitation_sum) {
            console.error(`Weather data API failed for [${lat}, ${lon}]:`, weatherData.reason || 'No precipitation data.');
            return DEFAULT_RAINFALL;
        }

        const precipitationSumArray = weatherData.daily.precipitation_sum;
        const annualRainfall = precipitationSumArray.reduce((sum, current) => sum + (current || 0), 0);
        
        return Math.round(annualRainfall);

    } catch (error) {
        console.error('Critical API Fetch Error in getRainfallData:', error.message);
        return DEFAULT_RAINFALL;
    }
}
// --- END DYNAMIC RAINFALL FUNCTION ---


// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected successfully!'))
    .catch(err => console.error('MongoDB connection error:', err));

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());


// --- API Routes (Signup/Login remain unchanged) ---

// Route for User Sign Up (Existing)
app.post('/api/signup', async (req, res) => {
    try {
        const { name, phone, password } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({
            fullName: name,
            phoneNumber: phone,
            password: hashedPassword
        });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Phone number is already registered.' });
        }
        console.error(error);
        res.status(500).json({ message: 'Error registering user.' });
    }
});

// Route for User Login (Existing)
app.post('/api/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        const user = await User.findOne({ phoneNumber: phone });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }
        res.status(200).json({ message: 'Login successful!', user: { id: user._id, fullName: user.fullName } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error logging in.' });
    }
});

// Route for Assessment Form Submission (FINAL CALCULATION LOGIC)
app.post('/api/assessment', async (req, res) => {
    try {
        const formData = req.body;
        
        // CRITICAL CHECK: Ensure phone is present and is a string before proceeding
        if (!formData.phone || typeof formData.phone !== 'string') {
             return res.status(400).json({ message: 'Invalid or missing phone number in form data.' });
        }
        
        // 1. Find or create the user (uses phoneNumber to match schema/other routes)
        let user = await User.findOne({ phoneNumber: formData.phone });
        if (!user) {
            // New user creation: Now works because `fullName` is optional in the schema.
            user = new User({
                fullName: formData.fullName || 'New User', 
                phoneNumber: formData.phone, // Ensure correct schema field name is used
                password: 'placeholder_password'
            });
            await user.save();
        } else if (formData.fullName && user.fullName !== formData.fullName) {
             // CRITICAL FIX: If user exists but name is missing/different, update it now
             user.fullName = formData.fullName;
             await user.save();
        }

        // --- CORE HYDROLOGICAL CALCULATION ---
        const annualRainfallMM = await getRainfallData(formData.location);
        const runoffCoefficient = RUNOFF_COEFFICIENTS[formData.roofType] || RUNOFF_COEFFICIENTS.other;
        const harvestableWaterLiters = Math.round(
            annualRainfallMM * formData.roofArea * runoffCoefficient
        );

        // --- RECOMMENDATION LOGIC ---

        let overallFeasibilityScore;
        if (harvestableWaterLiters > 150000) {
            overallFeasibilityScore = "HIGHLY SUITABLE";
        } else {
            overallFeasibilityScore = "MODERATELY SUITABLE";
        }

        let recommendedStructure;
        const existingWellType = formData.existingWell;
        const purpose = formData.purpose;
        
        if (purpose === 'storage') {
            recommendedStructure = "Storage Tank (Cistern)";
        } else if (purpose === 'recharge' && (existingWellType === 'borewell' || existingWellType === 'openwell' || existingWellType === 'both')) {
            recommendedStructure = "Recharge Shaft";
        } else {
            recommendedStructure = "Recharge Pit/Trench";
        }

        // --- FINANCIAL CALCULATION & TIER GENERATION (USING FIXED CONSTANTS) ---
        
        const standardCost = FIXED_COST_TIERS.standard.cost;
        const estimatedPaybackPeriod = (standardCost / BASE_ANNUAL_SAVINGS).toFixed(1);

        // --- SCENARIO CALCULATION for Chart ---
        const calculateHarvestableWater = (roofArea, roofType, rainfall) => {
             const coeff = RUNOFF_COEFFICIENTS[roofType] || RUNOFF_COEFFICIENTS.other;
             return Math.round(rainfall * roofArea * coeff);
        };
        
        const lowRainfall = Math.max(annualRainfallMM * 0.7, 500); 
        const highRainfall = annualRainfallMM * 1.3;
        
        const scenarios = {
            low: {
                rainfall: lowRainfall,
                harvestable: calculateHarvestableWater(formData.roofArea, formData.roofType, lowRainfall)
            },
            actual: {
                rainfall: annualRainfallMM,
                harvestable: harvestableWaterLiters
            },
            high: {
                rainfall: highRainfall,
                harvestable: calculateHarvestableWater(formData.roofArea, formData.roofType, highRainfall)
            }
        };


        // 2. Create and save the new assessment
        const newAssessment = new Assessment({
            userId: user._id,
            location: formData.location,
            roofArea: formData.roofArea,
            roofType: formData.roofType,
            buildingType: formData.buildingType,
            numberOfOccupants: formData.occupants,
            openSpace: formData.openSpace,
            existingWell: formData.existingWell,
            soilType: formData.soilType,
            dailyWaterUsage: formData.waterUsage,
            purpose: formData.purpose,
            budgetRange: formData.budget
        });
        await newAssessment.save();

        // 3. Create and save the dynamic report data
        const newReport = new Report({
            assessmentId: newAssessment._id,
            overallFeasibilityScore: overallFeasibilityScore, 
            annualHarvestableWaterLiters: harvestableWaterLiters, 
            recommendedStructure: recommendedStructure, 
            
            estimatedPaybackPeriodYears: parseFloat(estimatedPaybackPeriod),
            costTiers: FIXED_COST_TIERS, 
            scenarios: scenarios, // Store scenarios for the chart
            projectCostEstimate: { min: FIXED_COST_TIERS.basic.cost, max: FIXED_COST_TIERS.premium.cost }, 
            
            hydrogeologicalProfile: {
                localRainfall_mm: annualRainfallMM, 
                soilType: formData.soilType || "Alluvial",
                principalAquifer: DEFAULT_AQUIFER_TYPE,
                groundwaterDepth_meters: formData.groundwaterDepth || DEFAULT_GROUNDWATER_DEPTH
            }
        });
        await newReport.save();

        res.status(201).json({
            message: 'Assessment submitted successfully!',
            assessmentId: newAssessment._id,
            reportId: newReport._id 
        });
    } catch (error) {
        console.error('Error in assessment submission:', error);
        res.status(500).json({ message: 'Error processing form submission. Please try again.' });
    }
});

// Route to fetch and display all users (for debugging) - Unchanged
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching user data.' });
    }
});

// NEW ROUTE: PDF Report Generation (Unchanged, relies on assessment being successful)
app.get('/api/report/:assessmentId', async (req, res) => {
    const lang = req.query.lang || 'en';
    let browser;
    try {
        const { assessmentId } = req.params;

        // 1. Fetch data from MongoDB
        const assessment = await Assessment.findById(assessmentId).populate('userId').lean();
        const report = await Report.findOne({ assessmentId }).lean();

        if (!assessment || !report) {
            return res.status(404).send('Assessment or Report not found.');
        }
        
        // --- DYNAMIC STRUCTURE DETAILS LOGIC ---
        let diameter, depth, constructionDetail;
        const structure = report.recommendedStructure;
        
        switch (structure) {
            case "Recharge Shaft":
                diameter = "1.5 - 2.0 meters";
                depth = "18 - 30 meters";
                constructionDetail = "Vertical shaft accessing deep aquifer. Requires expert drilling and graded filter media.";
                break;
            case "Storage Tank (Cistern)":
                const volumeLiters = (assessment.dailyWaterUsage || 300) * 60; 
                const volumeCubicMeters = (volumeLiters / 1000).toFixed(1);
                diameter = `Capacity: ${volumeCubicMeters} m³ (Approx ${volumeLiters.toLocaleString('en-IN')} Liters)`;
                depth = "Varies (Above or Underground)";
                constructionDetail = "Sealed, opaque plastic or reinforced concrete tank for collection and direct use.";
                break;
            case "Recharge Pit/Trench":
                diameter = "1.0 - 1.5 meters wide";
                depth = "1.5 - 3.0 meters deep";
                constructionDetail = "Simple pit/trench filled with layers of boulders, gravel, and sand for shallow percolation.";
                break;
            default:
                diameter = "Varies by dimension";
                depth = "Varies by type";
                constructionDetail = "Requires custom design based on final site visit.";
        }
        // --- END DYNAMIC STRUCTURE DETAILS LOGIC ---


        // 2. Compile all data for the template
        const reportData = {
            date: new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN'),
            assessment: assessment,
            user: assessment.userId, 
            report: report,
            translations: TRANSLATIONS[lang] || TRANSLATIONS.en,
            lang: lang,
            costTiersArray: [
                { label: report.costTiers.basic.label, cost: report.costTiers.basic.cost, structure: report.costTiers.basic.structure, payback: (report.costTiers.basic.cost / BASE_ANNUAL_SAVINGS).toFixed(1) },
                { label: report.costTiers.standard.label, cost: report.costTiers.standard.cost, structure: report.costTiers.standard.structure, payback: report.estimatedPaybackPeriodYears },
                { label: report.costTiers.premium.label, cost: report.costTiers.premium.cost, structure: report.costTiers.premium.structure, payback: (report.costTiers.premium.cost / BASE_ANNUAL_SAVINGS).toFixed(1) },
            ],
            structureData: [
                { item: "Type", value: structure },
                { item: "Diameter/Capacity", value: diameter },
                { item: "Depth", value: depth },
                { item: "Construction", value: constructionDetail },
            ],
            // Variables needed for the EJS Chart script
            rainfallValue: report.hydrogeologicalProfile.localRainfall_mm,
            paybackValue: report.estimatedPaybackPeriodYears,
            roofArea: assessment.roofArea,
            roofType: assessment.roofType,
            getRunoffCoefficient: (type) => RUNOFF_COEFFICIENTS[type] || 0.60 
        };

        // 3. Render EJS template to HTML string
        const templatePath = path.join(__dirname, 'reportTemplate.ejs');
        const htmlContent = await ejs.renderFile(templatePath, reportData);

        // 4. Generate PDF using Puppeteer
        browser = await puppeteer.launch({
            executablePath: puppeteer.executablePath(),
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security'
            ],
            headless: true,
            timeout: 60000 
        });
        
        const page = await browser.newPage();
        
        // Set longer timeouts for page operations
        page.setDefaultNavigationTimeout(60000);
        page.setDefaultTimeout(60000);
        
        await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 1 });
        
        // --- CRITICAL FIX: Inject Content and Wait for Chart ---
        await page.setContent(htmlContent, { 
            waitUntil: 'domcontentloaded', 
            timeout: 60000
        });
        
        try {
            // Wait for chart to be defined first
            await page.waitForFunction('typeof Chart !== "undefined"', {
                polling: 100,
                timeout: 60000
            });
            
            // Then wait for our specific chart to render
            await page.waitForFunction('typeof chartRendered === "function" && chartRendered.done', {
                polling: 100,
                timeout: 60000 // Increased timeout to 60 seconds
            });
            
            // Small final pause for clean rendering (e.g., fonts/CSS redraw)
            await page.waitForTimeout(2000);
        } catch (chartError) {
            console.error('Chart rendering error:', chartError);
            // If chart fails to render, we'll still try to generate the PDF
            console.log('Proceeding with PDF generation despite chart rendering issue');
        }
        
        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '40px', right: '40px', bottom: '40px', left: '40px' },
            preferCSSPageSize: true,
            timeout: 60000
        });
        
        // 5. Stream PDF back to the client for download
        res.setHeader('Content-Disposition', `attachment; filename="RWHGenius_Report_${assessmentId}.pdf"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.send(pdfBuffer);

    } catch (error) {
        console.error('PDF Generation ERROR TRAP:', error);
        res.status(500).json({ message: 'Error generating report. Check server logs for details.' });
    } finally {
        // Ensure browser is always closed
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.error('Error closing browser:', closeError);
            }
        }
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

// Route for User Registration (New)
app.post('/api/register', async (req, res) => {
    const { phone } = req.body;
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({ error: 'Invalid phone number' });
    }
    try {
        // FIX 1: Change lookup to use `phoneNumber` field
        let user = await User.findOne({ phoneNumber: phone });
        if (!user) {
            // FIX 2: Change creation to use `phoneNumber` and add `fullName`
            user = new User({ phoneNumber: phone, fullName: 'Assessment User' });
            await user.save();
        }
        // FIX 3: Always return 200/success for quick registration to proceed to assessment
        res.status(200).json({ success: true, message: 'Registration successful or user already exists.' });
    } catch (err) {
        // FIX 4: Handle the E11000 duplicate key error and still return success
        console.error('Database error on register:', err);
        if (err.code === 11000) {
             return res.status(200).json({ success: true, message: 'User already exists, proceeding to assessment.' });
        }
        res.status(500).json({ error: 'Database error' });
    }
});
