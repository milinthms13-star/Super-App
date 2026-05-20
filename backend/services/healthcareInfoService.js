const LAB_TEST_INFO = {
  'complete blood count': {
    purpose: 'CBC bloodile RBC, WBC, platelet, hemoglobin levels check cheyyan ullath aanu.',
    usedFor: 'Fever, infection, anemia, weakness, general health screening.',
    preparation: 'Usually fasting venda. Doctor/lab instruction follow cheyyuka.',
  },
  'diabetes test': {
    purpose: 'Blood sugar level ariyan. Diabetes undo/control il ano enn nokkan.',
    usedFor: 'Diabetes screening, sugar control monitoring, tiredness, frequent urination.',
    preparation: 'Fasting sugar aanenkil 8-10 hours fasting venam.',
  },
  'thyroid profile': {
    purpose: 'Thyroid hormone level check cheyyan. TSH/T3/T4 values nokkum.',
    usedFor: 'Weight change, tiredness, hair fall, irregular periods, thyroid monitoring.',
    preparation: 'Morning sample preferred. Thyroid tablet kazhikkunnavar doctor instruction follow cheyyuka.',
  },
  'pregnancy test': {
    purpose: 'Pregnancy hormone hCG detect cheyyan ullath aanu.',
    usedFor: 'Missed period and pregnancy confirmation.',
    preparation: 'Urine/blood type anusarich lab instruction follow cheyyuka.',
  },
  'lipid profile': {
    purpose: 'Cholesterol and triglyceride levels check cheyyan.',
    usedFor: 'Heart risk, cholesterol monitoring, obesity, diabetes, BP patients.',
    preparation: 'Some labs fasting parayum. Booking time il confirm cheyyuka.',
  },
  'liver function test': {
    purpose: 'Liver enzymes and bilirubin level check cheyyan.',
    usedFor: 'Jaundice, alcohol/medicine effect, liver disease monitoring.',
    preparation: 'Usually fasting venda, but lab instruction follow cheyyuka.',
  },
  'mri scan': {
    purpose: 'Magnetic imaging use cheyth body internal organs/brain/spine/joints detail ayi kanan.',
    usedFor: 'Brain, spine, joint injury, tumor/inflammation evaluation.',
    preparation: 'Metal items remove cheyyanam. Pacemaker/implants undenkil labine ariyikkuka.',
  },
  'ct scan': {
    purpose: 'X-ray based cross-sectional scan aanu. Internal injury/organ detail kanan.',
    usedFor: 'Head injury, chest/abdomen problems, stones, trauma.',
    preparation: 'Contrast scan aanenkil fasting/allergy/kidney history labine ariyikkuka.',
  },
  ultrasound: {
    purpose: 'Sound waves use cheyth organs, pregnancy, abdomen, kidney etc scan cheyyan.',
    usedFor: 'Pregnancy, abdomen pain, kidney/gall bladder, uterus/ovary evaluation.',
    preparation: 'Abdomen/pelvis scan aanenkil water kudich bladder full venam enn parayum.',
  },
  'x-ray': {
    purpose: 'Bones/chest/lungs basic imaging check cheyyan.',
    usedFor: 'Fracture, chest infection, injury, joint pain.',
    preparation: 'Metal ornaments remove cheyyuka. Pregnancy possibility undenkil ariyikkuka.',
  },
  '2d echo': {
    purpose: 'Heart structure and pumping function ultrasound pole check cheyyan.',
    usedFor: 'Chest pain, breathlessness, BP/heart disease monitoring.',
    preparation: 'Usually special preparation venda.',
  },
  mammography: {
    purpose: 'Breast tissue X-ray screening aanu.',
    usedFor: 'Breast lump, pain, screening, family history.',
    preparation: 'Deodorant/powder avoid cheyyuka; previous reports kondu varuka.',
  },
};

const MEDICINE_INFO = {
  'paracetamol 500mg': {
    purpose: 'Fever and mild pain reliefinu commonly use cheyyunna medicine aanu.',
    ingredients: 'Paracetamol / Acetaminophen 500mg',
    warning: 'Overdose liverinu harmful aanu. Alcohol use undenkil doctor advice venam.',
  },
  'vitamin d3': {
    purpose: 'Vitamin D deficiency correctioninum bone health supportinum use cheyyunnu.',
    ingredients: 'Cholecalciferol / Vitamin D3',
    warning: 'High dose long-term use doctor advice illathe avoid cheyyuka.',
  },
  'blood pressure medicine': {
    purpose: 'BP control cheyyan doctor prescribe cheyyunna medicine category aanu.',
    ingredients: 'Medicine brand anusarich Amlodipine/Telmisartan/Losartan etc vary cheyyum.',
    warning: 'Prescription required. Sudden stop cheyyaruthu unless doctor says.',
  },
  'antibiotic course': {
    purpose: 'Bacterial infection treatmentinu doctor prescribe cheyyum.',
    ingredients: 'Antibiotic molecule brand anusarich vary cheyyum.',
    warning: 'Prescription required. Full course doctor paranja pole complete cheyyanam.',
  },
  'insulin pen': {
    purpose: 'Diabetes patients blood sugar controlinu insulin delivery device aanu.',
    ingredients: 'Insulin type brand anusarich vary cheyyum: rapid/short/long acting insulin.',
    warning: 'Prescription and storage instruction strictly follow cheyyuka.',
  },
  'calcium tablets': {
    purpose: 'Calcium deficiency/bone health supportinu use cheyyunnu.',
    ingredients: 'Calcium carbonate/citrate with Vitamin D3, brand anusarich vary cheyyum.',
    warning: 'Kidney stone history undenkil doctor advice venam.',
  },
  'cetirizine 10mg': {
    purpose: 'Allergy, sneezing, itching, runny nose symptoms kurakkan use cheyyunnu.',
    ingredients: 'Cetirizine Hydrochloride 10mg',
    warning: 'Sleepiness undakum. Driving/operating machinery caution.',
  },
  'amoxicillin 500mg': {
    purpose: 'Bacterial infection treatmentinu use cheyyunna antibiotic aanu.',
    ingredients: 'Amoxicillin 500mg',
    warning: 'Prescription required. Penicillin allergy undenkil avoid/do doctor consult.',
  },
  'metformin 500mg': {
    purpose: 'Type 2 diabetes blood sugar controlinu use cheyyunnu.',
    ingredients: 'Metformin Hydrochloride 500mg',
    warning: 'Prescription required. Kidney/liver issue undenkil doctor advice venam.',
  },
  'omeprazole 20mg': {
    purpose: 'Acidity/GERD symptoms kurakkan stomach acid reduce cheyyunnu.',
    ingredients: 'Omeprazole 20mg',
    warning: 'Long-term use doctor advice anusarich mathram.',
  },
};

const normalize = (value = '') => String(value || '').trim().toLowerCase();

const defaultLabInfo = (name = '') => ({
  purpose: `${name || 'This test'} body condition assess cheyyan doctor/lab suggest cheyyunna diagnostic test aanu.`,
  usedFor: 'Symptoms, screening, follow-up, or doctor recommendation based evaluation.',
  preparation: 'Booking before lab preparation/fasting instruction confirm cheyyuka.',
});

const defaultMedicineInfo = (medicine = {}) => ({
  purpose: `${medicine.name || 'This medicine'} doctor/pharmacist advice anusarich use cheyyenda medicine aanu.`,
  ingredients:
    medicine.ingredients ||
    medicine.composition ||
    'Exact ingredients brand/strip label anusarich verify cheyyuka.',
  warning: medicine.requiresPrescription
    ? 'Prescription required. Doctor advice illathe use cheyyaruthu.'
    : 'Label instructions and pharmacist advice follow cheyyuka.',
});

const buildLabTestInfo = (labTest = {}) => {
  const lookup = LAB_TEST_INFO[normalize(labTest.name)];
  const fallback = defaultLabInfo(labTest.name);
  return {
    purpose: labTest.purpose || lookup?.purpose || fallback.purpose,
    usedFor: labTest.usedFor || lookup?.usedFor || fallback.usedFor,
    preparation: labTest.preparationNotes || lookup?.preparation || fallback.preparation,
  };
};

const buildMedicineInfo = (medicine = {}) => {
  const lookup = MEDICINE_INFO[normalize(medicine.name)];
  const fallback = defaultMedicineInfo(medicine);
  return {
    purpose: medicine.purpose || lookup?.purpose || fallback.purpose,
    ingredients: medicine.ingredients || lookup?.ingredients || fallback.ingredients,
    warning: medicine.warning || lookup?.warning || fallback.warning,
  };
};

const explainLabTestQuery = (queryText = '', tests = []) => {
  const normalizedQuery = normalize(queryText);
  const items = Array.isArray(tests) ? tests : [];
  if (!normalizedQuery) {
    return { query: '', matches: [], fallback: null };
  }

  const matches = items
    .map((test) => ({ ...test, info: buildLabTestInfo(test) }))
    .filter((test) => {
      return (
        normalize(test.name).includes(normalizedQuery) ||
        normalize(test.type).includes(normalizedQuery) ||
        normalize(test.info.purpose).includes(normalizedQuery) ||
        normalize(test.info.usedFor).includes(normalizedQuery)
      );
    })
    .slice(0, 5)
    .map((test) => ({
      id: test.id || String(test._id || ''),
      name: test.name,
      type: test.type || 'blood',
      info: test.info,
    }));

  return {
    query: queryText,
    matches,
    fallback: matches.length === 0 ? defaultLabInfo(queryText) : null,
  };
};

const explainMedicineQuery = (queryText = '', medicines = []) => {
  const normalizedQuery = normalize(queryText);
  const items = Array.isArray(medicines) ? medicines : [];
  if (!normalizedQuery) {
    return { query: '', matches: [], fallback: null };
  }

  const matches = items
    .map((medicine) => ({ ...medicine, info: buildMedicineInfo(medicine) }))
    .filter((medicine) => {
      return (
        normalize(medicine.name).includes(normalizedQuery) ||
        normalize(medicine.category).includes(normalizedQuery) ||
        normalize(medicine.info.purpose).includes(normalizedQuery) ||
        normalize(medicine.info.ingredients).includes(normalizedQuery)
      );
    })
    .slice(0, 5)
    .map((medicine) => ({
      id: medicine.id || String(medicine._id || ''),
      name: medicine.name,
      category: medicine.category || '',
      requiresPrescription: Boolean(medicine.requiresPrescription),
      info: medicine.info,
    }));

  return {
    query: queryText,
    matches,
    fallback: matches.length === 0 ? defaultMedicineInfo({ name: queryText }) : null,
  };
};

module.exports = {
  buildLabTestInfo,
  buildMedicineInfo,
  explainLabTestQuery,
  explainMedicineQuery,
};
