import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "assets/database/hear-voice-seed.db");
const dataDirectory = resolve(root, "scripts/voice-data");
const catalogueSource = resolve(dataDirectory, "catalogue.json");
const locationSource = resolve(dataDirectory, "uk-locations.csv");

function loadCatalogue() {
  return JSON.parse(readFileSync(catalogueSource, "utf8"));
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
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])),
  );
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value) {
  return normalize(value).split(" ").filter(Boolean);
}

function metaphone(word) {
  let w = word.toUpperCase().replace(/[^A-Z]/g, "");
  if (!w) return "";

  if (
    w.startsWith("KN") ||
    w.startsWith("GN") ||
    w.startsWith("PN") ||
    w.startsWith("WR") ||
    w.startsWith("PS")
  ) {
    w = w.slice(1);
  } else if (w.startsWith("X")) {
    w = "S" + w.slice(1);
  } else if (w.startsWith("WH")) {
    w = "W" + w.slice(2);
  }

  let result = "";
  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    const next = w[i + 1] ?? "";
    const next2 = w[i + 2] ?? "";
    const prev = w[i - 1] ?? "";

    if (c === prev && c !== "C") continue;

    if (c === "A" || c === "E" || c === "I" || c === "O" || c === "U" || c === "Y") {
      if (i === 0) result += c;
    } else if (c === "B") {
      if (!(prev === "M" && i === w.length - 1)) result += "B";
    } else if (c === "C") {
      if (next === "I" && next2 === "A") {
        result += "X";
        i += 2;
      } else if (next === "H") {
        result += "X";
        i++;
      } else if (next === "E" || next === "I" || next === "Y") {
        result += "S";
      } else {
        result += "K";
      }
    } else if (c === "D") {
      if (next === "G" && (next2 === "E" || next2 === "I" || next2 === "Y")) {
        result += "J";
        i += 2;
      } else {
        result += "T";
      }
    } else if (c === "F") {
      result += "F";
    } else if (c === "G") {
      if (next === "H" && i === w.length - 2) {
        // silent GH at word end
      } else if (next === "E" || next === "I" || next === "Y") {
        result += "J";
      } else {
        result += "K";
      }
    } else if (c === "H") {
      if ("AEIOUY".includes(next) && !"CSPTG".includes(prev)) {
        result += "H";
      }
    } else if (c === "J") {
      result += "J";
    } else if (c === "K") {
      if (prev !== "C") result += "K";
    } else if (c === "L") {
      result += "L";
    } else if (c === "M") {
      result += "M";
    } else if (c === "N") {
      result += "N";
    } else if (c === "P") {
      if (next === "H") {
        result += "F";
        i++;
      } else {
        result += "P";
      }
    } else if (c === "Q") {
      result += "K";
    } else if (c === "R") {
      result += "R";
    } else if (c === "S") {
      if (next === "H" || (next === "I" && (next2 === "O" || next2 === "A"))) {
        result += "X";
        i += next === "H" ? 1 : 2;
      } else {
        result += "S";
      }
    } else if (c === "T") {
      if (next === "I" && (next2 === "A" || next2 === "O")) {
        result += "X";
        i += 2;
      } else if (next === "H") {
        result += "0";
        i++;
      } else if (next === "C" && next2 === "H") {
        result += "X";
        i += 2;
      } else {
        result += "T";
      }
    } else if (c === "V") {
      result += "F";
    } else if (c === "W") {
      if ("AEIOUY".includes(next)) result += "W";
    } else if (c === "X") {
      result += "KS";
    } else if (c === "Z") {
      result += "S";
    }
  }

  return result.slice(0, 6);
}

function soundexKey(value) {
  const token = value.toLowerCase();
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
}

function phoneticCodes(value) {
  return {
    primary: tokens(value).map((token) => metaphone(token) || soundexKey(token)).join("-"),
    secondary: tokens(value).map(soundexKey).join("-"),
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

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && String(value).trim() ? number : null;
}

function aliasEntries(rawAliases) {
  if (!rawAliases) return [];
  return rawAliases.map((entry) =>
    typeof entry === "string"
      ? { alias: entry, source: "editorial" }
      : entry,
  );
}

function buildDatabase() {
  const catalogue = loadCatalogue();
  const locations = parseCsv(readFileSync(locationSource, "utf8"));
  const locationAliasByNormalizedName = new Map(
    (catalogue.locationAliases ?? []).map((entry) => [
      normalize(entry.name),
      entry,
    ]),
  );
  mkdirSync(resolve(output, ".."), { recursive: true });
  rmSync(output, { force: true });
  const database = new DatabaseSync(output);
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE voice_entities (
      entity_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      canonical_name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      primary_metaphone TEXT,
      secondary_metaphone TEXT,
      popularity REAL NOT NULL DEFAULT 0,
      metadata_json TEXT,
      revision TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (entity_type, entity_id)
    );
    CREATE INDEX idx_voice_entity_normalized ON voice_entities(normalized_name);
    CREATE INDEX idx_voice_entity_primary_metaphone ON voice_entities(primary_metaphone);
    CREATE INDEX idx_voice_entity_secondary_metaphone ON voice_entities(secondary_metaphone);

    CREATE TABLE voice_aliases (
      alias_id INTEGER PRIMARY KEY,
      entity_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      alias TEXT NOT NULL,
      normalized_alias TEXT NOT NULL,
      primary_metaphone TEXT,
      secondary_metaphone TEXT,
      alias_source TEXT,
      weight REAL NOT NULL DEFAULT 1
    );
    CREATE INDEX idx_voice_alias_normalized ON voice_aliases(normalized_alias);
    CREATE INDEX idx_voice_alias_primary_metaphone ON voice_aliases(primary_metaphone);
    CREATE INDEX idx_voice_alias_secondary_metaphone ON voice_aliases(secondary_metaphone);
    CREATE UNIQUE INDEX idx_voice_alias_entity_norm ON voice_aliases(entity_type, entity_id, normalized_alias);

    CREATE VIRTUAL TABLE voice_entity_fts USING fts5(
      entity_key UNINDEXED,
      entity_type UNINDEXED,
      search_text,
      tokenize='unicode61 remove_diacritics 2'
    );

    CREATE TABLE voice_entity_trigrams (
      entity_key TEXT NOT NULL,
      trigram TEXT NOT NULL,
      PRIMARY KEY (entity_key, trigram)
    );
    CREATE INDEX idx_voice_entity_trigram ON voice_entity_trigrams(trigram);

    CREATE TABLE voice_token_rarity (
      token TEXT PRIMARY KEY,
      rarity REAL NOT NULL
    );

    CREATE TABLE locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      normalized TEXT NOT NULL,
      admin_area TEXT,
      latitude REAL,
      longitude REAL,
      population INTEGER,
      rank REAL NOT NULL DEFAULT 1,
      timezone TEXT
    );
    CREATE INDEX locations_name ON locations(normalized);

    CREATE TABLE voice_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    PRAGMA user_version = 7;
  `);

  const insertEntity = database.prepare(
    "INSERT OR IGNORE INTO voice_entities (entity_id, entity_type, canonical_name, normalized_name, primary_metaphone, secondary_metaphone, popularity, metadata_json, revision) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const insertAlias = database.prepare(
    "INSERT OR IGNORE INTO voice_aliases (entity_id, entity_type, alias, normalized_alias, primary_metaphone, secondary_metaphone, alias_source, weight) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const findAlias = database.prepare(
    "SELECT alias_id AS aliasId FROM voice_aliases WHERE entity_type = ? AND entity_id = ? AND normalized_alias = ?",
  );
  const insertFts = database.prepare(
    "INSERT INTO voice_entity_fts (rowid, entity_key, entity_type, search_text) VALUES (?, ?, ?, ?)",
  );
  const insertGram = database.prepare(
    "INSERT OR IGNORE INTO voice_entity_trigrams (entity_key, trigram) VALUES (?, ?)",
  );
  const insertLocation = database.prepare(
    "INSERT OR IGNORE INTO locations (id, name, normalized, admin_area, latitude, longitude, population, rank, timezone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );

  const corpus = [];

  function addEntity(type, id, name, popularity, metadata, aliases) {
    const normalizedName = normalize(name);
    const codes = phoneticCodes(normalizedName);
    const entityKey = `${type}:${id}`;
    corpus.push(normalizedName);
    insertEntity.run(
      id,
      type,
      name,
      normalizedName,
      codes.primary || null,
      codes.secondary || null,
      popularity ?? 0,
      metadata ? JSON.stringify(metadata) : null,
      catalogue.revision,
    );
    const allAliases = [{ alias: name, source: "canonical" }, ...aliasEntries(aliases)];
    const seen = new Set();
    for (const entry of allAliases) {
      const normalizedAlias = normalize(entry.alias);
      if (!normalizedAlias) continue;
      const dedupeKey = `${entry.source}:${normalizedAlias}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const aliasCodes = phoneticCodes(normalizedAlias);
      const result = insertAlias.run(
        id,
        type,
        entry.alias,
        normalizedAlias,
        aliasCodes.primary || null,
        aliasCodes.secondary || null,
        entry.source ?? "editorial",
        entry.source === "validated-asr" ? 1.5 : 1,
      );
      const aliasId =
        result.changes > 0
          ? result.lastInsertRowid
          : findAlias.get(type, id, normalizedAlias)?.aliasId;
      if (aliasId) {
        corpus.push(normalizedAlias);
        if (result.changes > 0) {
          insertFts.run(aliasId, entityKey, type, normalizedAlias);
        }
        for (const gram of trigrams(normalizedAlias)) {
          insertGram.run(entityKey, gram);
        }
      }
    }
  }

  database.exec("BEGIN");
  for (const category of catalogue.categories ?? []) {
    addEntity("category", category.id, category.name, 1, null, category.aliases);
  }
  for (const publication of catalogue.publications ?? []) {
    addEntity(
      "publication",
      publication.id,
      publication.name,
      0.9,
      publication.storyIds ? { storyIds: publication.storyIds } : null,
      publication.aliases,
    );
  }
  for (const organization of catalogue.organizations ?? []) {
    addEntity(
      "organization",
      organization.id,
      organization.name,
      0.9,
      organization.storyIds ? { storyIds: organization.storyIds } : null,
      organization.aliases,
    );
  }
  for (const creator of catalogue.creators ?? []) {
    addEntity(
      "creator",
      creator.id,
      creator.name,
      0.8,
      creator.storyIds ? { storyIds: creator.storyIds } : null,
      creator.aliases,
    );
  }
  for (const tag of catalogue.tags ?? []) {
    addEntity("tag", tag.id, tag.name, 0.8, null, tag.aliases);
  }
  for (const story of catalogue.stories ?? []) {
    addEntity(
      "story",
      story.id,
      story.title,
      1,
      null,
      [
        story.creator ? { alias: story.creator, source: "editorial" } : null,
        story.publication ? { alias: story.publication, source: "editorial" } : null,
      ].filter(Boolean),
    );
  }
  for (const location of locations) {
    const id = location.id;
    const name = location.name;
    if (!id || !name) continue;
    const metadata = {
      adminArea: location.admin_name || location.admin_area || null,
      latitude: numberOrNull(location.lat || location.latitude),
      longitude: numberOrNull(location.lng || location.longitude),
      population: numberOrNull(location.population),
    };
    const popularity = Math.min(1, Number(location.ranking || location.weight || 1) / 10000);
    addEntity("location", id, name, Math.max(0.05, popularity), metadata, []);
    insertLocation.run(
      id,
      name,
      location.normalized || normalize(name),
      location.admin_name || location.admin_area || null,
      numberOrNull(location.lat || location.latitude),
      numberOrNull(location.lng || location.longitude),
      numberOrNull(location.population),
      Number(location.ranking || location.weight || 1),
      location.timezone || "Europe/London",
    );
    const override = locationAliasByNormalizedName.get(normalize(name));
    if (override) {
      const normalizedAlias = normalize(override.alias);
      const codes = phoneticCodes(normalizedAlias);
      const result = insertAlias.run(
        id,
        "location",
        override.alias,
        normalizedAlias,
        codes.primary || null,
        codes.secondary || null,
        override.source ?? "validated-asr",
        1.5,
      );
      if (result.changes > 0) {
        const aliasId = result.lastInsertRowid;
        if (aliasId) {
          insertFts.run(aliasId, `location:${id}`, "location", normalizedAlias);
        }
        for (const gram of trigrams(normalizedAlias)) {
          insertGram.run(`location:${id}`, gram);
        }
      }
    }
  }

  const documentFrequency = new Map();
  const seenDocuments = new Set();
  for (const text of corpus) {
    const documentTokens = new Set(tokens(text));
    const docKey = [...documentTokens].sort().join("|");
    if (seenDocuments.has(docKey)) continue;
    seenDocuments.add(docKey);
    for (const token of documentTokens) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }
  const totalDocuments = Math.max(seenDocuments.size, 1);
  const insertRarity = database.prepare(
    "INSERT OR IGNORE INTO voice_token_rarity (token, rarity) VALUES (?, ?)",
  );
  for (const [token, frequency] of documentFrequency) {
    const rarity =
      Math.log(1 + totalDocuments / (1 + frequency)) / Math.log(1 + totalDocuments);
    insertRarity.run(token, Math.max(0, Math.min(1, rarity)));
  }

  database
    .prepare(
      "INSERT OR REPLACE INTO voice_metadata (key, value) VALUES ('content_revision', ?)",
    )
    .run(catalogue.revision);
  database
    .prepare(
      "INSERT OR REPLACE INTO voice_metadata (key, value) VALUES ('dataset_attribution', ?)",
    )
    .run("SimpleMaps UK Cities Basic, CC BY 4.0, https://simplemaps.com/data/uk-cities");

  database.exec("COMMIT; VACUUM;");
  const total = database.prepare("SELECT COUNT(*) AS count FROM voice_entities").get().count;
  const aliasTotal = database.prepare("SELECT COUNT(*) AS count FROM voice_aliases").get().count;
  database.close();
  console.log(
    `Built ${output} with ${total} entities and ${aliasTotal} aliases (revision ${catalogue.revision}).`,
  );
}

buildDatabase();
