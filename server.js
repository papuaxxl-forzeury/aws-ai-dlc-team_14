// Dockyard Dash game server: serves the static game page and the
// durable high-score API backing it. Scores live in a JSON file on
// disk (scores.json) so they survive a process restart.
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'scores.json');
const MAX_NAME_LEN = 20;
const MAX_ENTRIES = 20;

function loadScores() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (err) {
    return [];
  }
}

function saveScores(scores) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(scores, null, 2));
}

if (!fs.existsSync(DATA_FILE)) {
  saveScores([]);
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Returns the current top scores, highest first.
app.get('/scores', (req, res) => {
  const scores = loadScores()
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ENTRIES);
  res.json({ scores });
});

// Submits one completed run's result. Validated strictly: a round
// of Dockyard Dash earns its score only from in-game deliveries
// (100 points per delivery times the live combo multiplier, capped
// at x5), so the server only accepts plausible, well-typed values.
app.post('/scores', (req, res) => {
  const { name, score, comboHigh } = req.body || {};

  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }
  const trimmedName = name.trim().slice(0, MAX_NAME_LEN);

  if (typeof score !== 'number' || !Number.isFinite(score) || !Number.isInteger(score)) {
    return res.status(400).json({ error: 'score must be an integer' });
  }
  if (score < 0 || score > 1000000) {
    return res.status(400).json({ error: 'score out of allowed range' });
  }

  let combo = 1;
  if (comboHigh !== undefined) {
    if (typeof comboHigh !== 'number' || !Number.isInteger(comboHigh) || comboHigh < 1 || comboHigh > 5) {
      return res.status(400).json({ error: 'comboHigh must be an integer between 1 and 5' });
    }
    combo = comboHigh;
  }

  const scores = loadScores();
  const entry = {
    name: trimmedName,
    score,
    comboHigh: combo,
    at: new Date().toISOString(),
  };
  scores.push(entry);
  // Keep only the top entries on disk so the file can't grow unbounded.
  const trimmed = scores.sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
  saveScores(trimmed);

  const rank = trimmed.findIndex((e) => e === entry);
  res.status(201).json({
    entry,
    rank: rank === -1 ? null : rank + 1,
    highScore: trimmed[0] ? trimmed[0].score : score,
    scores: trimmed,
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Dockyard Dash listening on http://127.0.0.1:${PORT}`);
});
