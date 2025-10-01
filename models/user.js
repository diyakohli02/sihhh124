const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
    // FIX: Changed to phoneNumber to match server.js usage, added trim for safety
    phoneNumber: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true
    },
    // FIX: Added fullName for report generation, set to optional
    fullName: { 
        type: String, 
        required: false 
    },
    // Added password field for completeness of the model, set to optional
    password: { 
        type: String, 
        required: false 
    }
});
module.exports = mongoose.model('User', UserSchema);
