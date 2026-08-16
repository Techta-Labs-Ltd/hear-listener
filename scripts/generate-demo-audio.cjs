const { writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

const sampleRate = 22050;
const durationSeconds = 30;
const frames = sampleRate * durationSeconds;
const output = resolve(__dirname, "../assets/audio/demo-story.wav");

const data = Buffer.alloc(frames * 2);
const notes = [261.63, 329.63, 392.0, 329.63, 293.66, 349.23, 440.0, 349.23];
const noteLength = 3.2;

for (let i = 0; i < frames; i++) {
  const t = i / sampleRate;
  const noteIndex = Math.min(
    notes.length - 1,
    Math.floor(t / noteLength) % notes.length,
  );
  const freq = notes[noteIndex];
  const withinNote = (t % noteLength) / noteLength;
  const envelope = Math.sin(Math.PI * withinNote) ** 2;
  const amplitude =
    0.055 * envelope * (0.75 + 0.25 * Math.sin(2 * Math.PI * 0.15 * t));
  const sample =
    Math.sin(2 * Math.PI * freq * t) * 0.72 +
    Math.sin(2 * Math.PI * freq * 2 * t) * 0.18 +
    Math.sin(2 * Math.PI * 110 * t) * 0.1;
  const value = Math.round(sample * amplitude * 32767);
  data.writeInt16LE(Math.max(-32768, Math.min(32767, value)), i * 2);
}

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);

writeFileSync(output, Buffer.concat([header, data]));
console.log(`Wrote ${output} (${Math.round(data.length / 1024)} KB)`);
