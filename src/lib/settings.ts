import { prisma } from "@/lib/prisma";

export const SystemSettings = {
  // Get a setting value by key, with optional default
  async get(key: string, defaultValue?: string): Promise<string | null> {
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });
    return setting?.value ?? defaultValue ?? null;
  },

  // Set a setting value
  async set(key: string, value: string): Promise<void> {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  },

  // Get multiple settings at once
  async getMany(keys: string[]): Promise<Record<string, string | null>> {
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: keys } },
    });
    
    const result: Record<string, string | null> = {};
    keys.forEach(key => {
        const found = settings.find(s => s.key === key);
        result[key] = found?.value ?? null;
    });
    
    return result;
  }
};
