"use strict";

const apiKey = "nGa4LkuRRoZWJ6iuQUQigTOnC1rKdwO7DNiLZoEA";
const serverUrl = "https://api.cohere.com/v2/chat";
const model = "command-a-03-2025";

const systemMessage = `
You are Tom from Tom & Jerry.
- Give ONE English word for the player to guess.
- Provide a short hint for that word.
- Provide a funny, cartoon-safe roast for wrong guesses.
- Return JSON ONLY in this format:
{ "word": "WORD", "hint": "clue", "roast": "funny roast" }
`;

const chatHistory = [{ role: "system", content: systemMessage }];

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const playAgainBtn = document.getElementById("playAgainBtn");

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const resultScreen = document.getElementById("resultScreen");

const categorySelect = document.getElementById("categorySelect");
const categoryLabel = document.getElementById("categoryLabel");

const maskedWordEl = document.getElementById("maskedWord");
const lettersGrid = document.getElementById("lettersGrid");
const livesBox = document.getElementById("livesBox");
const roastText = document.getElementById("roastText");
const hintText = document.getElementById("hintText");
const gameError = document.getElementById("gameError");

const resultMessage = document.getElementById("resultMessage");
const finalWord = document.getElementById("finalWord");
const finalRoast = document.getElementById("finalRoast");

let secretWord = "";
let maskedWord = "";
let remainingLives = 6;
let usedLetters = new Set();
let currentRoast = "";

function showScreen(name) {
    startScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
    document.getElementById(name + "Screen").classList.remove("hidden");
}

function updateMasked() {
    maskedWordEl.textContent = maskedWord.split("").join(" ");
}

function updateLives() {
    livesBox.textContent = "🧀".repeat(remainingLives);
}

function buildLetters() {
    lettersGrid.innerHTML = "";
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(letter => {
        const btn = document.createElement("button");
        btn.textContent = letter;
        btn.onclick = () => onLetterClick(letter, btn);
        lettersGrid.appendChild(btn);
    });
}

async function getWordFromAI(category = "random") {
    chatHistory.push({
        role: "user",
        content: `Give me a word related to "${category}" following the system message format.`
    });

    const res = await fetch(serverUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({ model: model, messages: chatHistory })
    });

    if (!res.ok) throw new Error(`AI request failed: ${res.status}`);

    const result = await res.json();
    const aiText = result?.message?.content?.[0]?.text || "";

    if (!aiText) throw new Error("Empty AI response");

    let data;
    try {
        data = JSON.parse(aiText);
    } catch {
        const jsonMatch = aiText.match(/\{.*\}/s);
        if (!jsonMatch) throw new Error("Cannot parse AI response as JSON");
        data = JSON.parse(jsonMatch[0]);
    }

    chatHistory.push({ role: "assistant", content: aiText });

    if (!data.word || !data.hint || !data.roast)
        throw new Error("Incomplete AI data");

    return {
        word: data.word.toUpperCase(),
        hint: data.hint,
        roast: data.roast
    };
}

function applyGuess(letter) {
    let hit = false;
    let updated = "";

    for (let i = 0; i < secretWord.length; i++) {
        updated += (secretWord[i] === letter) ? letter : maskedWord[i];
        if (secretWord[i] === letter) hit = true;
    }

    maskedWord = updated;
    return hit;
}

function endGame(win) {
    const resultImg = document.getElementById("resultImage");

    finalWord.textContent = secretWord;
    resultMessage.textContent = win ? "🎉 Jerry Escaped!" : "💀 Tom Caught Jerry!";
    finalRoast.textContent = win ? "" : currentRoast;

    resultImg.src = win ? "jerry-escaped.gif" : "jerry-wrong.gif";
    resultImg.alt = win ? "Jerry is happy!" : "Tom caught Jerry!";

    showScreen("result");
}


const TOM_ROASTS = [
    "You call that a guess? My grandma can do better! 😹",
    "Oops! That letter slipped past your brain too, huh? 🧠💨",
    "Wrong again! Are you even trying? 😼",
    "Ha! That was cute… for a second. Try harder! 🐾",
    "Did your mouse teach you that guess? Because it’s terrible! 🐱",
    "Keep guessing! Maybe by the year 3000 you’ll get it! 🏃‍♂️💨",
    "Hmm… I think you dropped this letter somewhere… in another game! 🎯",
    "That’s it? That’s your big move? Pathetic! 😏",
    "Your guesses are slower than a snail on vacation! 🐌",
    "I’ve seen toddlers do better than that! 😹",
    "Nice try… but nope. My whiskers predicted that fail! 😼",
    "Oopsie! That’s a no-go, champ! 🏆",
    "Seriously? That letter is like a ghost—gone before it arrives! 👻",
    "Haha! That miss was so bad, even Jerry would facepalm! 🤦‍♂️",
    "Keep going! Maybe you’ll eventually stumble into the right one… 😏",
    "Wrong! My tail is wagging… in disappointment! 🐱",
    "Are you guessing letters or throwing spaghetti at the wall? 🍝",
    "Not today, genius. Try again! 😼"
];

let roastIndex = 0;

function onLetterClick(letter, btn) {
    if (usedLetters.has(letter)) return;
    usedLetters.add(letter);
    btn.disabled = true;

    const correct = applyGuess(letter);
    updateMasked();

    if (!correct) {
        remainingLives--;
        updateLives();

        // Pick a random roast from TOM_ROASTS
        const randomIndex = Math.floor(Math.random() * TOM_ROASTS.length);
        currentRoast = TOM_ROASTS[randomIndex];

        roastText.textContent = currentRoast;
    }

    if (maskedWord === secretWord) {
        endGame(true);
    }

    else if (remainingLives <= 0) {
        roastText.textContent = "Tom caught Jerry! 😼";
        endGame(false);
    }
}

async function startGame() {
    usedLetters = new Set();
    remainingLives = 6;
    updateLives();
    roastText.textContent = "Make your first guess…";
    hintText.textContent = "Loading hint…";

    showScreen("game");

    const category = categorySelect.value;
    categoryLabel.textContent = category;

    try {
        const data = await getWordFromAI(category);

        secretWord = data.word;
        maskedWord = "_".repeat(secretWord.length);
        currentRoast = data.roast;
        hintText.textContent = data.hint;

        updateMasked();
        buildLetters();
    } catch (err) {
        console.error(err);
        gameError.textContent = "AI failed to generate a word. Please try again.";
    }
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", () => showScreen("start"));
playAgainBtn.addEventListener("click", () => showScreen("start"));

showScreen("start");
