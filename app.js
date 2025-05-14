require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const OpenAI = require('openai'); 

const app = express();
const port = process.env.PORT || 3000;

if (!process.env.GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY is not configured.");
    process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY is not configured.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-latest",
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let activeDebate = {}; 

function sendSseEvent(res, data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}

app.get('/', (req, res) => {
    res.render('index'); 
});

app.post('/start-debate', async (req, res) => {
    const { topic } = req.body;
    

    if (!topic) {
        return res.status(400).json({ error: 'The debate topic is required.' });
    }

    activeDebate = true; 

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); 
    const debateId = `debate_${Date.now()}`
    sendSseEvent(res, { type: 'status', message: `Debate started on: "${topic}". Waiting for OpenAI...`, debateId });

    try {
        let fullOpenAiResponse = "";
        let fullGeminiResponse = "";
        let turnCounter = 0;
        let currentTurn = 0;
        const MAX_TURNS = 8; 

        if (!activeDebate) {
            sendSseEvent(res, { type: 'status', message: 'Debate stopped before OpenAI started.', event: 'debate_ended' });
            res.end(); return;
        }

        sendSseEvent(res, { type: 'info', source: 'system', message: `OpenAI (for) is preparing its argument on: "${topic}"` });
        const openAIPrompt = `You are an expert debater. The topic of the debate is: "${topic}". Please present a strong and well-structured opening argument in favor of this topic. Be persuasive and clear. Your argument should be a maximum of 50 words.`;
        const openaiStream = await openai.chat.completions.create({
            model: "gpt-4o-mini", 
            messages: [{ role: "user", content: openAIPrompt }],
            stream: true,
        });

        for await (const chunk of openaiStream) {
            if (!activeDebate) break; 
            const textChunk = chunk.choices[0]?.delta?.content || "";
            if (textChunk) {
                fullOpenAiResponse += textChunk;
                sendSseEvent(res, { type: 'chunk', source: 'openai', text: textChunk });
            }
        }
        if (!activeDebate) {
             sendSseEvent(res, { type: 'status', message: 'Debate stopped during OpenAI’s turn.', event: 'debate_ended' });
             res.end(); return;
        }
        sendSseEvent(res, { type: 'turn_end', source: 'openai', full_text: fullOpenAiResponse });
        turnCounter++;

        
        while(turnCounter < MAX_TURNS && activeDebate){
        if (currentTurn==0){
            if (!activeDebate) {
                 sendSseEvent(res, { type: 'status', message: 'Debate stopped before Gemini started.', event: 'debate_ended' });
                 res.end(); return;
            }
            sendSseEvent(res, { type: 'info', source: 'system', message: `Gemini (against) is preparing its response to OpenAI’s argument...` });
            const geminiPrompt = `You are an expert debater. The topic of the debate is: "${topic}". OpenAI has presented the following argument in favor:\n\n"${fullOpenAiResponse}"\n\nPlease present a strong and well-structured counterargument, refuting OpenAI’s points if possible, and taking a stance against the original topic. Be persuasive and clear. Your argument should be a maximum of 50 words.`;
            fullOpenAiResponse = "";
            const geminiChat = geminiModel.startChat({});
            const geminiResultStream = await geminiChat.sendMessageStream(geminiPrompt);

            for await (const chunk of geminiResultStream.stream) {
                if (!activeDebate) break; 
                const textChunk = chunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (textChunk) {
                    fullGeminiResponse += textChunk;
                    sendSseEvent(res, { type: 'chunk', source: 'gemini', text: textChunk });
                }
            }
            if (!activeDebate) {
                 sendSseEvent(res, { type: 'status', message: 'Debate stopped during Gemini’s turn.', event: 'debate_ended' });
                 res.end(); return;
            }
            sendSseEvent(res, { type: 'turn_end', source: 'gemini', full_text: fullGeminiResponse });
            turnCounter++;
            currentTurn=1
        }
        else{
        sendSseEvent(res, { type: 'info', source: 'system', message: `OpenAI responding to Gemini’s response... ` });
        const openAIPrompt = `You are an expert debater. The topic of the debate is: "${topic}". Gemini has presented the following argument against:\n\n"${fullGeminiResponse}"\n\nPlease present a strong and well-structured counterargument, refuting Gemini’s points if possible, and taking a stance against the original topic. Be persuasive and clear. Your argument should be a maximum of 50 words.`;
        fullGeminiResponse = "";
        const openaiStream = await openai.chat.completions.create({
            model: "gpt-4o-mini", 
            messages: [{ role: "user", content: openAIPrompt }],
            stream: true,
        });

        for await (const chunk of openaiStream) {
            if (!activeDebate) break; 
            const textChunk = chunk.choices[0]?.delta?.content || "";
            if (textChunk) {
                fullOpenAiResponse += textChunk;
                sendSseEvent(res, { type: 'chunk', source: 'openai', text: textChunk });
            }
        }
        if (!activeDebate) {
             sendSseEvent(res, { type: 'status', message: 'Debate stopped during OpenAI’s turn.', event: 'debate_ended' });
             res.end(); return;
        }
        sendSseEvent(res, { type: 'turn_end', source: 'openai', full_text: fullOpenAiResponse });
        turnCounter++;
        currentTurn=0
        }
        }

        if (activeDebate) {
            sendSseEvent(res, { type: 'status', message: 'Debate round completed.', event: 'debate_ended' });
        }

    } catch (error) {
        console.error("Error during the debate:", error);
        sendSseEvent(res, { type: 'error', message: `Server error: ${error.message || 'Unknown'}.`, event: 'debate_ended' });
    } finally {
        if (activeDebate) {
            delete activeDebate; 
        }
        res.end(); 
    }

   
    req.on('close', () => {
        console.log(`Client disconnected from the debate`);
        if (activeDebate) {
            activeDebate = false; 
        }
    });
});

app.get('/stop-debate', (req, res) => {
    if (activeDebate) {
        console.log(`Received signal to stop the debate`);
        activeDebate = false; 
        res.status(200).json({ message: `Stop signal sent for the debate.` });
    } 
    else {
        res.status(404).json({ message: `Debate not found or already stopped.` });
    }
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
