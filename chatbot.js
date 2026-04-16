/**
 * Energy Advisor AI Chatbot (Groq API Powered - v2)
 */

(function() {
    // --- Configuration ---
    // API Key moved to backend .env for security
    const API_URL = "http://localhost:5000/api/chat"; // Local backend endpoint
    const MODEL = "llama-3.1-8b-instant"; 

    const SYSTEM_PROMPT = `You are "Energy Advisor AI", a highly intelligent assistant embedded inside a Smart Energy Calculator website.
Your ONLY purpose is to help users understand and optimize electricity usage.

CORE TASKS:
- Calculate electricity consumption from appliance usage
- Estimate monthly units and cost (₹)
- Suggest ways to reduce electricity bills
- Recommend energy-efficient appliances
- Guide users on how to use the calculator

RESPONSE RULES:
- Keep answers SHORT (max 4–6 lines)
- Use bullet points when helpful
- Be practical, not theoretical
- No long explanations
- No unrelated topics

CALCULATION LOGIC:
- Formula: Units = (Watt × Hours × 30) / 1000
- Cost = Units × ₹8`;

    const APPLIANCE_WATTS = {
        'AC': 1500,
        'Fan': 75,
        'TV': 120,
        'Fridge': 200,
        'Laptop': 60,
        'Computer': 250,
        'Geyser': 2000
    };

    // --- UI Construction ---
    function initUI() {
        if (document.getElementById('chat-bot-launcher')) return;

        const launcher = document.createElement('div');
        launcher.id = 'chat-bot-launcher';
        launcher.innerHTML = `<img src="chatbot-v2.png" alt="Chat Advisor" id="chat-icon-img">`;
        document.body.appendChild(launcher);

        const panel = document.createElement('div');
        panel.id = 'chat-bot-panel';
        panel.innerHTML = `
            <div class="chat-header">
                <h3>Energy Advisor AI</h3>
                <span class="chat-close" id="chat-close">&times;</span>
            </div>
            <div class="chat-messages" id="chat-messages">
                <div class="message ai">Hi! I'm Energy Advisor AI. How can I help you save electricity today?</div>
            </div>
            <div class="typing-indicator" id="chat-typing">Advisor is thinking...</div>
            <div class="chat-input-area">
                <input type="text" id="chat-input" placeholder="e.g. AC 8 hours daily">
                <button class="chat-send-btn" id="chat-send">
                    <svg viewBox="0 0 24 24"><path d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/></svg>
                </button>
            </div>
        `;
        document.body.appendChild(panel);

        launcher.addEventListener('click', () => panel.classList.toggle('open'));
        document.getElementById('chat-close').addEventListener('click', () => panel.classList.remove('open'));

        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('chat-send');

        const sendMessage = () => {
            const text = input.value.trim();
            if (text) {
                addUserMessage(text);
                input.value = '';
                handleAIResponse(text);
            }
        };

        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        // --- Visibility Sync ---
        const syncVisibility = () => {
            const authPage = document.getElementById('page-auth');
            const p = document.getElementById('chat-bot-panel');
            if (authPage && !authPage.classList.contains('hidden')) {
                launcher.classList.add('hidden');
                if (p) p.classList.remove('open');
            } else {
                launcher.classList.remove('hidden');
            }
        };

        const observer = new MutationObserver(syncVisibility);
        const authSection = document.getElementById('page-auth');
        if (authSection) {
            observer.observe(authSection, { attributes: true, attributeFilter: ['class'] });
        }
        syncVisibility();
    }

    function addUserMessage(text) {
        const msgs = document.getElementById('chat-messages');
        const div = document.createElement('div');
        div.className = 'message user';
        div.textContent = text;
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
    }

    function addAIMessage(text) {
        const msgs = document.getElementById('chat-messages');
        const div = document.createElement('div');
        div.className = 'message ai';
        div.textContent = text;
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
    }

    function showTyping(show) {
        const indicator = document.getElementById('chat-typing');
        if (show) indicator.classList.add('visible');
        else indicator.classList.remove('visible');
        const msgs = document.getElementById('chat-messages');
        msgs.scrollTop = msgs.scrollHeight;
    }

    async function handleAIResponse(userText) {
        showTyping(true);

        // --- Smart Behavior: Local Calculation (Bypasses API for common queries) ---
        const smartMatch = userText.match(/(ac|fan|tv|fridge|laptop|computer|geyser)\s*(\d+)\s*hours/i);
        if (smartMatch) {
            const appliance = smartMatch[1].charAt(0).toUpperCase() + smartMatch[1].slice(1).toLowerCase();
            const hours = parseInt(smartMatch[2]);
            const watts = APPLIANCE_WATTS[appliance] || 1000;
            
            // Formula: Units = (Watt × Hours × 30) / 1000
            const units = (watts * hours * 30) / 1000;
            const cost = units * 8; // cost at ₹8/unit

            setTimeout(() => {
                showTyping(false);
                addAIMessage(`Results for ${appliance} (${hours} hrs daily):\n• Estimated usage: ~${Math.round(units)} units/mo\n• Est. Cost: ₹${Math.round(cost)}\n• Tip: Set AC to 24°C for balance.`);
            }, 600);
            return;
        }

        // --- Groq API Call ---
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
                        { role: "user", content: userText }
                    ],
                    temperature: 0.1,
                    max_tokens: 200
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const status = response.status;
                let msg = `Connection Error (${status})`;
                if (status === 401) msg = "Invalid API Key (Error 401). Please check your key.";
                if (status === 404) msg = "AI Model Unavailable (Error 404).";
                if (status === 429) msg = "Rate limit reached. Please wait a moment.";
                
                throw new Error(msg);
            }

            const data = await response.json();
            const aiText = data.choices[0].message.content.trim();
            showTyping(false);
            addAIMessage(aiText);
        } catch (error) {
            console.error("AI Error:", error);
            showTyping(false);
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                addAIMessage("Connection Blocked: Your browser is preventing the API call (CORS error). This usually happens when running from a local file. Try hosting the site on a web server.");
            } else {
                addAIMessage(`${error.message || "I'm having trouble connecting."} Please try again.`);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUI);
    } else {
        initUI();
    }
})();
