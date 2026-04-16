const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- Groq Proxy Endpoint (for Chatbot) ---
app.post('/api/chat', async (req, res) => {
    try {
        const { model, messages, temperature, max_tokens } = req.body;
        
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: model || "llama-3.1-8b-instant",
            messages,
            temperature: temperature ?? 0.1,
            max_tokens: max_tokens ?? 200
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Groq Proxy Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Internal Server Error' });
    }
});

// --- Gemini Proxy Endpoint (for AI Tips & Env Impact) ---
app.post('/api/ai', async (req, res) => {
    try {
        const { contents } = req.body;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
            return res.status(401).json({ error: 'Gemini API Key missing in backend .env' });
        }

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const response = await axios.post(API_URL, {
            contents
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Gemini Proxy Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Secure Server running on http://localhost:${PORT}`);
});
