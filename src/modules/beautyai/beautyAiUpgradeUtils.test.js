import { buildBeautyRequest, getMalayalamHelperPrompts, getBeautyPlanFallback } from './beautyAiUpgradeUtils';

describe('beautyAiUpgradeUtils', () => {
  test('buildBeautyRequest enforces boolean consent and shapes payload', () => {
    const payload = buildBeautyRequest(
      {
        language: 'ml',
        concern: 'acne',
        selectedConcerns: ['Acne'],
        gender: 'Female',
        age: '22',
        budget: 'low',
        eventType: 'daily-glow',
        skinType: 'oily',
        hairType: 'normal',
        notes: ' note ',
        consent: true,
        sensitiveSkin: true,
        knownAllergy: 'fragrance',
        pregnantOrBreastfeeding: false,
        usingSkinMedicine: true,
      },
      { fileName: 'a.jpg' },
      { confidence: 0.8 }
    );

    expect(payload.language).toBe('ml');
    expect(payload.notes).toBe('note');
    expect(payload.consent).toBe(true);
    expect(payload.safety.sensitiveSkin).toBe(true);
    expect(payload.selfieMeta.fileName).toBe('a.jpg');
  });

  test('Malayalam helper prompts and fallback title render non-garbled text', () => {
    const prompts = getMalayalamHelperPrompts();
    expect(prompts[0]).toContain('മുഖത്ത്');

    const fallback = getBeautyPlanFallback({ language: 'ml' }, 74);
    expect(fallback.title).toContain('സുരക്ഷിത');
    expect(fallback.summary).toContain('ഗുരുതര');
    expect(fallback.score).toBe(74);
  });
});
