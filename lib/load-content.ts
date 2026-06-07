import fs from "fs";
import path from "path";
import Papa from "papaparse";
import type { LessonConfig, DatasetRow } from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content");

export function loadLessonConfig(): LessonConfig {
  const configPath = path.join(CONTENT_DIR, "lesson-config.json");
  const raw = fs.readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw);
  // Strip the _comment_ keys; they're for the user, not the app
  const clean: any = {};
  for (const key of Object.keys(parsed)) {
    if (!key.startsWith("_")) clean[key] = parsed[key];
  }
  // Strip _ keys inside exercises too
  if (Array.isArray(clean.exercises)) {
    clean.exercises = clean.exercises.map((ex: any) => {
      const cleanEx: any = {};
      for (const k of Object.keys(ex)) {
        if (!k.startsWith("_")) cleanEx[k] = ex[k];
      }
      return cleanEx;
    });
  }
  return clean as LessonConfig;
}

export function loadDataset(filename: string): {
  headers: string[];
  rows: DatasetRow[];
} {
  const datasetPath = path.join(CONTENT_DIR, filename);
  const raw = fs.readFileSync(datasetPath, "utf-8");
  const parsed = Papa.parse<DatasetRow>(raw, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  const headers = parsed.meta.fields || [];
  const rows = parsed.data;
  return { headers, rows };
}
