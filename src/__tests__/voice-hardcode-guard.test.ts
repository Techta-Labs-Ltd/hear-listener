declare const __dirname: string;

type DirEntry = {
  name: string;
  isDirectory(): boolean;
  isFile(): boolean;
};

const fs = require("fs") as {
  readdirSync(dir: string, options: { withFileTypes: true }): DirEntry[];
  readFileSync(file: string, encoding: string): string;
  existsSync(filePath: string): boolean;
};

const path = require("path") as {
  resolve(...parts: string[]): string;
  join(...parts: string[]): string;
  basename(filePath: string): string;
  relative(from: string, to: string): string;
};

const VOICE_DIR = path.resolve(__dirname, "../services/voice");

const FORBIDDEN_PATTERNS = [
  /tynedale/i,
  /tyndale/i,
  /tinder/i,
  /talking magazine/i,
  /london community radio/i,
  /signal & noise/i,
  /still morning/i,
  /market street/i,
  /hear sport/i,
];

function sourceFiles(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry: DirEntry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) return [full];
      return [];
    });
}

function violationsFor(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const violations: string[] = [];
  for (const file of sourceFiles(dir)) {
    const content = fs.readFileSync(file, "utf8");
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(content)) {
        violations.push(`${path.relative(dir, file)} matches ${pattern}`);
      }
    }
  }
  return violations;
}

describe("catalog hardcode guard", () => {
  it("keeps catalog entity names out of production voice code", () => {
    const files = sourceFiles(VOICE_DIR);
    expect(files.length).toBeGreaterThan(0);
    expect(violationsFor(VOICE_DIR)).toEqual([]);
  });

  it("keeps catalog entity names out of voice providers, hooks and stores", () => {
    const all = [
      ...violationsFor(path.resolve(__dirname, "../providers")),
      ...violationsFor(path.resolve(__dirname, "../hooks")),
      ...violationsFor(path.resolve(__dirname, "../stores")),
    ];
    expect(all).toEqual([]);
  });
});
