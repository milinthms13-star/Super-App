const request = require('supertest');
const app = require('../app');

(async () => {
  try {
    const payload = {
      storyPrompt: 'A curious child discovers a glowing map in the attic and sets off on a magical journey to make new friends.',
      languageId: 'en',
      styleId: 'cartoon',
      voiceType: 'kid_female',
      videoSizeId: 'youtube',
      storyMode: 'bedtime',
      safeMode: true,
      ageFilter: '5-8',
      storySource: 'paste',
    };

    const res = await request(app)
      .post('/api/video-studio/create')
      .set('Accept', 'application/json')
      .send(payload)
      .timeout({ deadline: 15000, response: 15000 });

    console.log('STATUS:', res.status);
    console.log('HEADERS:', res.headers);
    console.log('BODY (truncated):', typeof res.body === 'object' ? JSON.stringify(res.body).slice(0, 800) : String(res.text).slice(0, 800));
  } catch (err) {
    console.error('Request failed:', err.message || err);
    if (err.response) {
      console.error('Response status:', err.response.status);
      console.error('Response body:', err.response.body || err.response.text);
    }
  }
})();
