import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "assets/database/hear-voice-seed.db");
const dataDirectory = resolve(root, "scripts/voice-data");
const intentSource = resolve(dataDirectory, "intents.json");
const locationSource = resolve(dataDirectory, "uk-locations.csv");

function extractSources() {
  mkdirSync(dataDirectory, { recursive: true });
  const database = new DatabaseSync(output, { readOnly: true });
  const intents = database
    .prepare(
      "SELECT canonical AS phrase, target_id AS action, weight FROM voice_terms WHERE kind = 'command' ORDER BY target_id, canonical",
    )
    .all();
  const locations = database
    .prepare(
      "SELECT canonical AS name, normalized, target_id AS id, weight FROM voice_terms WHERE kind = 'location' ORDER BY id, normalized",
    )
    .all();
  database.close();
  writeFileSync(intentSource, `${JSON.stringify(intents, null, 2)}\n`);
  writeFileSync(
    locationSource,
    [
      "id,name,normalized,weight",
      ...locations.map((item) =>
        [item.id, item.name, item.normalized, item.weight]
          .map(csvCell)
          .join(","),
      ),
    ].join("\n"),
  );
  console.log(
    `Extracted ${intents.length} intent phrases and ${locations.length} location terms.`,
  );
}

function buildDatabase() {
  const intents = JSON.parse(readFileSync(intentSource, "utf8"));
  const locations = parseCsv(readFileSync(locationSource, "utf8"));
  rmSync(output, { force: true });
  const database = new DatabaseSync(output);
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE voice_terms (id INTEGER PRIMARY KEY AUTOINCREMENT, canonical TEXT NOT NULL, normalized TEXT NOT NULL, kind TEXT NOT NULL, target_id TEXT, weight REAL NOT NULL DEFAULT 1, phonetic TEXT NOT NULL DEFAULT '', UNIQUE(normalized, kind, target_id));
    CREATE INDEX voice_terms_lookup ON voice_terms(kind, normalized, weight DESC);
    CREATE INDEX voice_terms_phonetic ON voice_terms(phonetic, kind);
    CREATE VIRTUAL TABLE voice_terms_fts USING fts5(canonical, normalized, kind UNINDEXED, target_id UNINDEXED, weight UNINDEXED, tokenize='unicode61 remove_diacritics 2');
    CREATE TABLE voice_actions (id TEXT PRIMARY KEY, executor_key TEXT NOT NULL, label TEXT NOT NULL, risk TEXT NOT NULL DEFAULT 'safe', confirmation INTEGER NOT NULL DEFAULT 0, slot_schema TEXT NOT NULL DEFAULT '{}', feedback TEXT NOT NULL DEFAULT '');
    CREATE TABLE intent_patterns (id INTEGER PRIMARY KEY, action_id TEXT NOT NULL REFERENCES voice_actions(id), phrase TEXT NOT NULL, normalized TEXT NOT NULL, weight REAL NOT NULL DEFAULT 1, UNIQUE(action_id, normalized));
    CREATE TABLE asr_substitutions (heard TEXT NOT NULL, canonical TEXT NOT NULL, locale TEXT NOT NULL DEFAULT 'en-GB', weight REAL NOT NULL DEFAULT 1, PRIMARY KEY(heard, canonical, locale));
    CREATE TABLE term_trigrams (term_id INTEGER NOT NULL REFERENCES voice_terms(id) ON DELETE CASCADE, trigram TEXT NOT NULL, PRIMARY KEY(term_id, trigram));
    CREATE INDEX term_trigrams_lookup ON term_trigrams(trigram, term_id);
    CREATE TABLE locations (id TEXT PRIMARY KEY, name TEXT NOT NULL, normalized TEXT NOT NULL, admin_area TEXT, latitude REAL, longitude REAL, population INTEGER, rank REAL NOT NULL DEFAULT 1, timezone TEXT);
    CREATE INDEX locations_name ON locations(normalized);
    CREATE TABLE learned_aliases (alias TEXT PRIMARY KEY, canonical TEXT NOT NULL, kind TEXT NOT NULL, target_id TEXT, confirmations INTEGER NOT NULL DEFAULT 1, weight REAL NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL, expires_at INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE voice_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE action_usage (action_id TEXT PRIMARY KEY, executions INTEGER NOT NULL DEFAULT 0, last_used_at INTEGER NOT NULL DEFAULT 0);
    INSERT INTO voice_metadata VALUES ('vocabulary_version', '2');
    INSERT INTO voice_metadata VALUES ('dataset_attribution', 'SimpleMaps UK Cities Basic, CC BY 4.0, https://simplemaps.com/data/uk-cities');
    PRAGMA user_version = 6;
  `);
  const insert = database.prepare(
    "INSERT OR IGNORE INTO voice_terms (canonical, normalized, kind, target_id, weight, phonetic) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const insertAction = database.prepare(
    "INSERT OR REPLACE INTO voice_actions(id,executor_key,label,risk,confirmation,slot_schema,feedback) VALUES(?,?,?,?,?,?,?)",
  );
  const insertPattern = database.prepare(
    "INSERT OR IGNORE INTO intent_patterns(action_id,phrase,normalized,weight) VALUES(?,?,?,?)",
  );
  const insertLocation = database.prepare(
    "INSERT OR REPLACE INTO locations(id,name,normalized,admin_area,latitude,longitude,population,rank,timezone) VALUES(?,?,?,?,?,?,?,?,?)",
  );
  database.exec("BEGIN");
  for (const action of ACTIONS) {
    insertAction.run(
      action.id,
      action.key,
      action.label,
      action.risk ?? "safe",
      action.confirm ? 1 : 0,
      JSON.stringify(action.slots ?? {}),
      action.feedback ?? "",
    );
    insertPattern.run(action.id, action.label, normalize(action.label), 2);
    insert.run(
      action.label,
      normalize(action.label),
      "action",
      action.id,
      2,
      phonetic(normalize(action.label)),
    );
  }
  for (const item of [...DEFAULT_PATTERNS, ...intents]) {
    const action =
      ACTIONS.find((entry) => entry.id === item.action) ??
      actionFromLegacyId(item.action);
    if (!ACTIONS.some((entry) => entry.id === action.id))
      insertAction.run(
        action.id,
        action.key,
        action.label,
        action.risk,
        action.confirm ? 1 : 0,
        "{}",
        "",
      );
    insertPattern.run(
      action.id,
      item.phrase,
      normalize(item.phrase),
      Number(item.weight ?? 1),
    );
    insert.run(
      item.phrase,
      normalize(item.phrase),
      "action",
      action.id,
      Number(item.weight),
      phonetic(normalize(item.phrase)),
    );
  }
  for (const item of locations) {
    insertLocation.run(
      item.id,
      item.name,
      item.normalized || normalize(item.name),
      item.admin_name || item.admin_area || null,
      numberOrNull(item.lat || item.latitude),
      numberOrNull(item.lng || item.longitude),
      numberOrNull(item.population),
      Number(item.ranking || item.weight || 1),
      item.timezone || "Europe/London",
    );
    insert.run(
      item.name,
      item.normalized || normalize(item.name),
      "location",
      item.id,
      Number(item.weight),
      phonetic(item.normalized || normalize(item.name)),
    );
  }
  const insertSubstitution = database.prepare(
    "INSERT OR REPLACE INTO asr_substitutions(heard,canonical,locale,weight) VALUES(?,?,'en-GB',?)",
  );
  for (const [heard, canonical, weight] of ASR_SUBSTITUTIONS)
    insertSubstitution.run(heard, canonical, weight);
  database.exec(
    "INSERT INTO voice_terms_fts (rowid, canonical, normalized, kind, target_id, weight) SELECT id, canonical, normalized, kind, target_id, weight FROM voice_terms;",
  );
  const insertGram = database.prepare(
    "INSERT OR IGNORE INTO term_trigrams(term_id,trigram) VALUES(?,?)",
  );
  for (const row of database
    .prepare("SELECT id,normalized FROM voice_terms")
    .all())
    for (const gram of trigrams(row.normalized)) insertGram.run(row.id, gram);
  database.exec("COMMIT; VACUUM;");
  const total = database
    .prepare("SELECT COUNT(*) AS count FROM voice_terms")
    .get().count;
  database.close();
  console.log(`Built ${output} with ${total} searchable terms.`);
}

const ACTIONS = [
  ["navigate:home", "navigate", "Open Home"],
  ["navigate:discover", "navigate", "Open Discover"],
  ["navigate:library", "navigate", "Open Library"],
  ["navigate:settings", "navigate", "Open Settings"],
  ["navigate:player", "navigate", "Open player"],
  ["close", "close", "Go back"],
  ["openLibrarySection:saved", "openLibrarySection", "Open saved audio"],
  [
    "openLibrarySection:following",
    "openLibrarySection",
    "Open followed sources",
  ],
  ["openLibrarySection:downloads", "openLibrarySection", "Open downloads"],
  ["openLibrarySection:history", "openLibrarySection", "Open history"],
  ["openTopic", "openTopic", "Open topic"],
  ["setLocation", "setLocation", "Change saved location", "privacy", true],
  ["search", "search", "Search"],
  ["play:current", "play", "Play"],
  ["play:latest", "play", "Play latest"],
  ["play:local", "play", "Play local news"],
  ["play:recommended", "play", "Play recommendation"],
  ["play:trending", "play", "Play trending"],
  ["play:saved", "play", "Play saved audio"],
  ["play:downloads", "play", "Play downloads"],
  ["play:story", "play", "Play story"],
  ["pause", "pause", "Pause"],
  ["resume", "resume", "Resume"],
  ["next", "next", "Next"],
  ["previous", "previous", "Previous"],
  ["restart", "restart", "Restart"],
  ["repeat:on", "repeat", "Enable repeat"],
  ["repeat:off", "repeat", "Disable repeat"],
  ["seek:forward", "seek", "Skip forward"],
  ["seek:backward", "seek", "Rewind"],
  ["speedStep:up", "speedStep", "Speed up"],
  ["speedStep:down", "speedStep", "Slow down"],
  ["speed:0.75", "speed", "Set speed"],
  ["speed:1", "speed", "Set speed"],
  ["speed:1.25", "speed", "Set speed"],
  ["speed:1.5", "speed", "Set speed"],
  ["speed:2", "speed", "Set speed"],
  ["saveCurrent", "saveCurrent", "Save current audio"],
  ["removeSaved", "removeSaved", "Remove saved audio", "destructive", true],
  ["downloadCurrent", "downloadCurrent", "Download current audio"],
  ["removeDownload", "removeDownload", "Remove download", "destructive", true],
  ["follow", "follow", "Follow source"],
  ["unfollow", "unfollow", "Unfollow source", "destructive", true],
  ["whatIsThis", "whatIsThis", "Describe current audio"],
  ["whoMadeThis", "whoMadeThis", "Name the creator"],
  ["sleepTimer", "sleepTimer", "Set sleep timer"],
  ["cancelSleepTimer", "cancelSleepTimer", "Cancel sleep timer"],
  ["addToQueue", "addToQueue", "Add to queue"],
  ["openQueue", "openQueue", "Open queue"],
  ["clearQueue", "clearQueue", "Clear queue", "destructive", true],
  ["changeLocation", "changeLocation", "Open location settings"],
  ["help", "help", "Voice help"],
  ["openAppSettings", "openAppSettings", "Open app settings"],
  ["openAudioSettings", "openAudioSettings", "Open audio settings"],
  ["openBluetoothSettings", "openBluetoothSettings", "Open Bluetooth settings"],
  ["openInternetSettings", "openInternetSettings", "Open internet settings"],
  ["openWifiSettings", "openWifiSettings", "Open Wi-Fi settings"],
  [
    "openAccessibilitySettings",
    "openAccessibilitySettings",
    "Open accessibility settings",
  ],
  ["openLocationSettings", "openLocationSettings", "Open location services"],
  [
    "resetVoiceCorrections",
    "resetVoiceCorrections",
    "Reset learned voice corrections",
    "destructive",
    true,
  ],
  ["readScreen", "readScreen", "Read the screen"],
  ["accountSignIn", "accountSignIn", "Sign in to Hear", "privacy", true],
  ["accountSignOut", "accountSignOut", "Sign out of Hear", "privacy", true],
  ["onboardingContinue", "onboardingContinue", "Continue setup"],
  ["onboardingBack", "onboardingBack", "Go back a step"],
  ["onboardingSkip", "onboardingSkip", "Skip this step"],
  ["onboardingSetTown", "onboardingSetTown", "Set up town", "privacy", true],
  ["onboardingRead", "onboardingRead", "Read this step"],
].map(([id, key, label, risk = "safe", confirm = false]) => ({
  id,
  key,
  label,
  risk,
  confirm,
}));
const DEFAULT_PATTERNS = [
  ["open discover", "navigate:discover"],
  ["open library", "navigate:library"],
  ["open settings", "navigate:settings"],
  ["open player", "navigate:player"],
  ["wifi setting", "openWifiSettings"],
  ["wifi settings", "openWifiSettings"],
  ["privacy settings", "openAppSettings"],
  ["accessibility settings", "openAccessibilitySettings"],
  ["voice settings", "navigate:settings"],
  ["continue with google", "accountSignIn"],
  ["sign in with google", "accountSignIn"],
  ["continue with apple", "accountSignIn"],
  ["sign in with apple", "accountSignIn"],
  ["sign out", "accountSignOut"],
  ["bluetooth", "openBluetoothSettings"],
  ["bluetooth settings", "openBluetoothSettings"],
  ["blue tooth settings", "openBluetoothSettings"],
  ["hearing device settings", "openBluetoothSettings"],
  ["pair my hearing device", "openBluetoothSettings"],
  ["wi fi settings", "openWifiSettings"],
  ["wireless settings", "openWifiSettings"],
  ["internet settings", "openInternetSettings"],
  ["network settings", "openInternetSettings"],
  ["audio output", "openAudioSettings"],
  ["sound settings", "openAudioSettings"],
  ["screen reader settings", "openAccessibilitySettings"],
  ["location settings", "openLocationSettings"],
  ["location services", "openLocationSettings"],
  ["local area settings", "openLocationSettings"],
  ["permission settings", "openAppSettings"],
  ["reset learned corrections", "resetVoiceCorrections"],
  ["forget voice corrections", "resetVoiceCorrections"],
  ["open saved audio", "openLibrarySection:saved"],
  ["open downloads", "openLibrarySection:downloads"],
  ["open history", "openLibrarySection:history"],
  ["open following", "openLibrarySection:following"],
  ["save this", "saveCurrent"],
  ["remove this from saved", "removeSaved"],
  ["download this", "downloadCurrent"],
  ["remove this download", "removeDownload"],
  ["resume", "resume"],
  ["previous", "previous"],
  ["turn repeat off", "repeat:off"],
  ["set a sleep timer for 20 minutes", "sleepTimer"],
  ["cancel sleep timer", "cancelSleepTimer"],
  ["add this to queue", "addToQueue"],
  ["open queue", "openQueue"],
  ["clear queue", "clearQueue"],
  ["play tyndale talking magazine", "play:story"],
  ["play tyndale magazine", "play:story"],
  ["play tyndale", "play:story"],
  ["play talking magazine", "play:story"],
  ["tyndale talking magazine", "play:story"],
  ["tyndale magazine", "play:story"],
  ["talking magazine", "play:story"],
].map(([phrase, action]) => ({ phrase, action, weight: 3 }));
const ASR_SUBSTITUTIONS = [
  ["paws", "pause", 5],
  ["ports", "pause", 3],
  ["yuck", "york", 6],
  ["tindale", "tyndale", 6],
  ["tindal", "tyndale", 6],
  ["tyndall", "tyndale", 6],
  ["tindell", "tyndale", 6],
  ["tindall", "tyndale", 6],
  ["magazin", "magazine", 5],
  ["wifisetting", "wifi settings", 6],
  ["wifisettings", "wifi settings", 6],
  ["why fi settings", "wifi settings", 4],
  ["wife eye settings", "wifi settings", 4],
  ["blue tooth", "bluetooth", 5],
  ["blutooth", "bluetooth", 6],
  ["bluettoh", "bluetooth", 6],
  ["bluetoth", "bluetooth", 6],
  ["blutooh", "bluetooth", 5],
  ["blootuth", "bluetooth", 5],
  ["access ability", "accessibility", 5],
  ["acessibility", "accessibility", 6],
  ["locashun", "location", 6],
  ["loction", "location", 6],
  ["locaton", "location", 6],
  ["lacation", "location", 6],
  ["loacation", "location", 6],
  ["ocation", "location", 4],
  ["localation", "location", 5],
  ["liberry", "library", 4],
  ["here app", "hear app", 3],
  ["re wind", "rewind", 3],
  ["sport from yuck", "sport from york", 5],
];
function actionFromLegacyId(id) {
  const key = id.split(":")[0];
  return {
    id,
    key,
    label: id.replaceAll(":", " "),
    risk: "safe",
    confirm: false,
  };
}
function trigrams(value) {
  const source = `  ${normalize(value).replaceAll(" ", "_")}  `;
  return [
    ...new Set(
      Array.from({ length: Math.max(0, source.length - 2) }, (_, index) =>
        source.slice(index, index + 3),
      ),
    ),
  ];
}
function phonetic(value) {
  return normalize(value)
    .split(" ")
    .map((token) => {
      const first = token[0] ?? "";
      const tail = token
        .slice(1)
        .replace(/[aeiouyhw]/g, "")
        .replace(/[bfpv]/g, "1")
        .replace(/[cgjkqsxz]/g, "2")
        .replace(/[dt]/g, "3")
        .replace(/l/g, "4")
        .replace(/[mn]/g, "5")
        .replace(/r/g, "6")
        .replace(/(.)\1+/g, "$1");
      return `${first}${tail}`.slice(0, 6);
    })
    .join("-");
}
function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && String(value).trim() ? number : null;
}

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
function parseCsv(source) {
  const rows = [];
  let row = [],
    field = "",
    quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field || row.length) rows.push([...row, field]);
  const [headers, ...values] = rows;
  return values.map((cells) =>
    Object.fromEntries(
      headers.map((header, index) => [header, cells[index] ?? ""]),
    ),
  );
}

if (process.argv.includes("--extract")) extractSources();
else buildDatabase();
