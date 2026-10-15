import fs from "fs";
import path from "path";

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "urgent";
  target: "all" | "branch";
  cawangan?: string | null;
  cawanganNama?: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  expiresAt?: string | null;
  isActive: boolean;
}

const DATA_DIR = path.join(process.cwd(), "data");
const ANNOUNCEMENTS_FILE = path.join(DATA_DIR, "announcements.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ANNOUNCEMENTS_FILE)) {
    fs.writeFileSync(ANNOUNCEMENTS_FILE, JSON.stringify([]), "utf-8");
  }
}

export async function getAnnouncements(): Promise<Announcement[]> {
  try {
    ensureDataDir();
    const content = await fs.promises.readFile(ANNOUNCEMENTS_FILE, "utf-8");
    return JSON.parse(content || "[]");
  } catch (error) {
    console.error("Error reading announcements:", error);
    return [];
  }
}

export async function saveAnnouncements(announcements: Announcement[]): Promise<void> {
  try {
    ensureDataDir();
    await fs.promises.writeFile(
      ANNOUNCEMENTS_FILE,
      JSON.stringify(announcements, null, 2),
      "utf-8"
    );
  } catch (error) {
    console.error("Error saving announcements:", error);
  }
}

export async function getActiveAnnouncementsForUser(
  idCawangan?: string | null
): Promise<Announcement[]> {
  const all = await getAnnouncements();
  const now = new Date();

  return all
    .filter((a) => {
      if (!a.isActive) return false;
      if (a.expiresAt && new Date(a.expiresAt) < now) return false;

      // Global announcement
      if (a.target === "all") return true;

      // Branch-specific announcement
      if (a.target === "branch" && idCawangan && a.cawangan === idCawangan) {
        return true;
      }

      return false;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
