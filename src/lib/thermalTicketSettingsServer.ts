import fs from "fs";
import path from "path";
import {
  TicketTemplateSettings,
  DEFAULT_TEMPLATE_SETTINGS,
} from "./thermalTicketTemplate";

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "ticket_template_settings.json");

export async function getTicketTemplateSettings(): Promise<TicketTemplateSettings> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = await fs.promises.readFile(SETTINGS_FILE, "utf-8");
      return { ...DEFAULT_TEMPLATE_SETTINGS, ...JSON.parse(content || "{}") };
    }
  } catch (err) {
    console.error("Error reading ticket template settings:", err);
  }
  return DEFAULT_TEMPLATE_SETTINGS;
}

export async function saveTicketTemplateSettings(
  settings: Partial<TicketTemplateSettings>
): Promise<TicketTemplateSettings> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const current = await getTicketTemplateSettings();
    const updated = { ...current, ...settings };
    await fs.promises.writeFile(SETTINGS_FILE, JSON.stringify(updated, null, 2), "utf-8");
    return updated;
  } catch (err) {
    console.error("Error saving ticket template settings:", err);
    return DEFAULT_TEMPLATE_SETTINGS;
  }
}
