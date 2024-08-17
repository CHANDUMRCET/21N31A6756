const express = require('express');
const axios = require('axios');
require('dotenv').config();
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const WINDOW_SIZE = 10;
let window = [];
let expiry = new Date();
let apiKey = process.env.API_KEY; // Use a variable to store the API key

// Endpoint mapping
const epMapping = {
    'p': 'primes',
    'f': 'fibo',
    'e': 'even',
    'r': 'rand'
};

// Serve static files (including index.html)
app.use(express.static(path.join(__dirname, 'public')));

// Function to refresh the token
async function refreshToken() {
    try {
        const headers = {
            'companyName': process.env.COMPANY_NAME,
            'clientID': process.env.CLIENT_ID,
            'clientSecret': process.env.CLIENT_SECRET,
            'ownerName': process.env.OWNER_NAME,
            'ownerEmail': process.env.OWNER_EMAIL,
            'rollNo': process.env.ROLL_NO
        };

        const response = await axios.post(process.env.REFRESH_TOKEN_URL, {}, { headers });

        apiKey = response.data.access_token; // Update the API key
        const newExpiresIn = response.data.expires_in;
        expiry = new Date(Date.now() + newExpiresIn * 1000); // Set new expiration date

        console.log('Token refreshed successfully. New token:', apiKey);
    } catch (error) {
        console.error('Failed to refresh token:', error.message);
    }
}

// Endpoint to get numbers based on number ID
app.get('/numbers/:numberid', async (req, res) => {
    const { numberid } = req.params;

    if (!epMapping[numberid]) {
        return res.status(400).json({ error: 'Invalid number ID' });
    }

    const endpoint = epMapping[numberid];
    const url = `http://20.244.56.144/test/${endpoint}`;
    let numbers = [];
    let windowPrevState = [...window];

    const now = new Date();
    if (now >= expiry) {
        console.log('Token has expired. Refreshing token...');
        await refreshToken();
    }

    try {
        console.log('Request URL:', url);
        console.log('Authorization Header:', `Bearer ${apiKey}`);

        const response = await axios.get(url, {
            timeout: 5000, // Increased timeout
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        console.log('API Response Data:', response.data);

        numbers = response.data.numbers || [];
        if (!Array.isArray(numbers)) {
            throw new Error('API response contains invalid data format');
        }

        const uniqueNumbers = numbers.filter(n => !window.includes(n));

        uniqueNumbers.forEach(num => {
            if (window.length >= WINDOW_SIZE) {
                window.shift();
            }
            window.push(num);
        });

    } catch (error) {
        console.error('Error Details:', error.response ? error.response.data : error.message);
        return res.status(500).json({ error: 'Failed to fetch numbers' });
    }

    const avg = window.length === WINDOW_SIZE ? (window.reduce((a, b) => a + b, 0) / WINDOW_SIZE).toFixed(2) : null;

    res.json({
        windowPrevState: windowPrevState,
        windowCurrState: window,
        numbers: numbers,
        avg: avg
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
