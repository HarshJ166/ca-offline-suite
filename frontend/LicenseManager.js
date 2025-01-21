const keytar = require('keytar');
const axios = require('axios');

const SERVICE_NAME = 'Cyphersol-dumm';
const LICENSE_KEY_ACCOUNT = 'license-key';
const API_URL = 'http://43.204.61.215/validate-offline-login/';
// username : 2-32e6d741
// licensekey : SOMEX4Y4ZLicenseKEYForCAOffline

class LicenseManager {
    // Static instance to hold the single instance of the class
    static instance;

    constructor() {
        if (LicenseManager.instance) {
            return LicenseManager.instance;
        }

        this.isActivated = false;
        LicenseManager.instance = this; // Set the singleton instance
    }

    static getInstance() {
        if (!LicenseManager.instance) {
            LicenseManager.instance = new LicenseManager();
        }
        return LicenseManager.instance;
    }

    // Initialize method to check for existing license key
    async init() {
        try {
            const licenseKey = await keytar.getPassword(SERVICE_NAME, LICENSE_KEY_ACCOUNT);
            console.log('Init licenseKey:', licenseKey);
            this.isActivated = !!licenseKey;
            console.log('Init isActivated:', this.isActivated);
            return this.isActivated;
        } catch (error) {
            console.error('License check failed:', error);
            return false;
        }
    }

    // Method to validate and store license key
    async validateAndStoreLicense(credentials) {
        try {
            console.log('Credentials:', credentials);
            const isValid = await this.validateLicense(credentials.licenseKey, credentials.email);

            if (isValid.success) {
                await keytar.setPassword(SERVICE_NAME, LICENSE_KEY_ACCOUNT, credentials.licenseKey);
                this.isActivated = true;
                return { success: true };
            }

            return {
                success: false,
                error: 'Invalid license key'
            };
        } catch (error) {
            console.log('License activation error:', error);
            return {
                success: false,
                error: 'License activation failed'
            };
        }
    }

    // Placeholder method for validating the license key
    async validateLicense(licenseKey, username) {
        try {
            const timestamp = Date.now() / 1000;

            const apiKey = 'U08fir-OsEXdgMZKARdgz5oPvyRT6cIZioOeV_kZdLMeXsAc46_x.CAgICAgICAo=';

            const response = await axios.post(API_URL, {
                username: username,
                license_key: licenseKey,
                timestamp: timestamp,
            }, {
                headers: {
                    'X-API-Key': apiKey,
                }
            });

            // console.log("License Validation Response : ", response);
            const { data } = response;
            console.log("Response Status : ", response.status)
            console.log("Data : ", data);

            // Handle successful response
            if (response.status === 200) {
                const expiryTimestamp = data.expiry_timestamp;
                const currentTimestamp = Date.now() / 1000;

                // Check if the license has expired
                if (currentTimestamp > expiryTimestamp) {
                    throw new Error('License key has expired');
                }

                return { success: true, data: data };
            } else {
                // Handle invalid license or username
                throw new Error(data.detail || 'License validation failed');
            }
        } catch (error) {
            console.error('License validation error: ', error.status, error.response.data);
            // Handle different error cases based on API response
            if (error.response) {
                // The API returned an error response
                return { success: false, error: error.response.data.detail || 'License validation failed' };
            } else if (error.request) {
                // No response received (possible network error)
                return { success: false, error: 'No response from the license validation server' };
            } else {
                // Some other error (e.g., misconfiguration or unexpected error)
                return { success: false, error: error.message };
            }
        }
    }

    // Method to check if the license is activated
    async checkActivation() {
        console.log('isActivated:', this.isActivated);
        return this.isActivated;
    }
}

// Export a single instance of the LicenseManager
// const licenseManager = new LicenseManager().getInstance();
module.exports = LicenseManager.getInstance();