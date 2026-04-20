const fs = require('fs/promises');
const path = require('path');
const { DEFAULT_APP_DATA } = require('./defaultAppData');

const dataDir = path.join(__dirname, '..', 'data');
const dataFilePath = path.join(dataDir, 'app-data.json');

const ensureFile = async () => {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(dataFilePath);
  } catch (error) {
    await fs.writeFile(dataFilePath, JSON.stringify(DEFAULT_APP_DATA, null, 2), 'utf8');
  }
};

const readAppData = async () => {
  await ensureFile();
  const raw = await fs.readFile(dataFilePath, 'utf8');

  try {
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_APP_DATA,
      ...parsed,
      moduleData: {
        ...DEFAULT_APP_DATA.moduleData,
        ...(parsed.moduleData || {}),
      },
    };
  } catch (error) {
    return DEFAULT_APP_DATA;
  }
};

const writeAppData = async (appData) => {
  await ensureFile();
  await fs.writeFile(dataFilePath, JSON.stringify(appData, null, 2), 'utf8');
};

const updateAppData = async (updater) => {
  const currentData = await readAppData();
  const nextData = await updater(currentData);
  await writeAppData(nextData);
  return nextData;
};

module.exports = {
  readAppData,
  writeAppData,
  updateAppData,
};
