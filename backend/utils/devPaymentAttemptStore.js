const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(__dirname, '..', 'data');
const dataFilePath = path.join(dataDir, 'payment-attempts.json');

const ensureFile = async () => {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(dataFilePath);
  } catch (error) {
    await fs.writeFile(dataFilePath, '[]', 'utf8');
  }
};

const readAttempts = async () => {
  await ensureFile();
  const raw = await fs.readFile(dataFilePath, 'utf8');

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const writeAttempts = async (attempts) => {
  await ensureFile();
  await fs.writeFile(dataFilePath, JSON.stringify(attempts, null, 2), 'utf8');
};

const createAttempt = async (attempt) => {
  const attempts = await readAttempts();
  const nextAttempt = {
    id: crypto.randomUUID(),
    status: 'created',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...attempt,
  };

  attempts.unshift(nextAttempt);
  await writeAttempts(attempts);
  return nextAttempt;
};

const findAttemptById = async (attemptId) => {
  const attempts = await readAttempts();
  return attempts.find((attempt) => attempt.id === attemptId) || null;
};

const updateAttempt = async (attemptId, updater) => {
  const attempts = await readAttempts();
  const index = attempts.findIndex((attempt) => attempt.id === attemptId);

  if (index === -1) {
    return null;
  }

  const currentAttempt = attempts[index];
  const nextAttempt = {
    ...currentAttempt,
    ...(typeof updater === 'function' ? updater(currentAttempt) : updater),
    updatedAt: new Date().toISOString(),
  };

  attempts[index] = nextAttempt;
  await writeAttempts(attempts);
  return nextAttempt;
};

module.exports = {
  createAttempt,
  findAttemptById,
  updateAttempt,
};
