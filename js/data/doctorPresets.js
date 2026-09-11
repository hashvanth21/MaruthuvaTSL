// Doctor Clinical Questions, Examination Commands & Prescription Templates
// Bilingual: Tamil (தமிழ்) & English with TSL Sequence Chains

export const DOCTOR_PRESETS = [
  {
    category: 'clinical_inquiry',
    categoryNameTa: 'மருத்துவர் கேள்விகள் (Clinical Inquiry)',
    items: [
      {
        id: 'q_where_hurt',
        textTa: 'உங்களுக்கு எங்கே வலிக்கிறது? கையை வைத்து காட்டுங்கள்.',
        textEn: 'Where does it hurt? Please point to the location.',
        tslChain: ['where_is_pain', 'stomach_pain'],
        audioTa: 'உங்களுக்கு எங்கே வலிக்கிறது? கையை வைத்து காட்டுங்கள்.',
        audioEn: 'Where does it hurt? Please point to the exact location on your body.'
      },
      {
        id: 'q_how_many_days',
        textTa: 'இந்த வலி அல்லது காய்ச்சல் எத்தனை நாட்களாக உள்ளது?',
        textEn: 'How many days have you had this pain or fever?',
        tslChain: ['fever', 'morning_afternoon_night'],
        audioTa: 'இந்த வலி அல்லது காய்ச்சல் எத்தனை நாட்களாக உள்ளது?',
        audioEn: 'For how many days have you been experiencing this symptom?'
      },
      {
        id: 'q_severity',
        textTa: 'வலி லேசாக உள்ளதா அல்லது தாங்க முடியாத அளவுக்கு அதிகமாக உள்ளதா?',
        textEn: 'Is the pain mild or very severe / unbearable?',
        tslChain: ['severe_pain', 'where_is_pain'],
        audioTa: 'வலி லேசாக உள்ளதா அல்லது தாங்க முடியாத அளவுக்கு அதிகமாக உள்ளதா?',
        audioEn: 'Is the pain mild, moderate, or extremely severe?'
      },
      {
        id: 'q_food_intake',
        textTa: 'உணவு சரியாக சாப்பிடுகிறீர்களா? வாந்தி ஏதும் வருகிறதா?',
        textEn: 'Are you eating food normally? Any vomiting sensation?',
        tslChain: ['after_food', 'vomiting'],
        audioTa: 'உணவு சரியாக சாப்பிடுகிறீர்களா? வாந்தி ஏதும் வருகிறதா?',
        audioEn: 'Are you able to eat food normally, or do you feel nauseous and vomit?'
      },
      {
        id: 'q_diabetes_bp',
        textTa: 'உங்களுக்கு சர்க்கரை நோய் அல்லது ரத்த அழுத்தம் உள்ளதா?',
        textEn: 'Do you have a prior history of Diabetes or High BP?',
        tslChain: ['diabetes', 'blood_pressure'],
        audioTa: 'உங்களுக்கு சர்க்கரை நோய் அல்லது ரத்த அழுத்தம் உள்ளதா?',
        audioEn: 'Do you have any known medical history of Diabetes or Blood Pressure?'
      }
    ]
  },
  {
    category: 'physical_exam',
    categoryNameTa: 'உடல் பரிசோதனை கட்டளைகள் (Examination Commands)',
    items: [
      {
        id: 'cmd_breathe',
        textTa: 'மூச்சை நன்றாக ஆழமாக உள்ளே இழுத்து மெதுவாக வெளியே விடுங்கள்.',
        textEn: 'Please take a deep breath in through your nose and exhale slowly.',
        tslChain: ['breathe_deeply'],
        audioTa: 'மூச்சை நன்றாக ஆழமாக உள்ளே இழுத்து மெதுவாக வெளியே விடுங்கள்.',
        audioEn: 'Take a deep breath in and slowly breathe out.'
      },
      {
        id: 'cmd_open_mouth',
        textTa: 'வாயை அகல திறந்து உங்கள் நாக்கை வெளியே நீட்டி காட்டுங்கள்.',
        textEn: 'Open your mouth wide and stick out your tongue for examination.',
        tslChain: ['open_mouth_tongue'],
        audioTa: 'வாயை அகல திறந்து உங்கள் நாக்கை வெளியே நீட்டி காட்டுங்கள்.',
        audioEn: 'Please open your mouth wide and stick out your tongue.'
      },
      {
        id: 'cmd_bp_check',
        textTa: 'உங்கள் கையை நேராக நீட்டுங்கள், ரத்த அழுத்தத்தை (BP) பரிசோதிக்க போகிறேன்.',
        textEn: 'Please keep your arm straight, I am going to check your blood pressure.',
        tslChain: ['blood_pressure'],
        audioTa: 'உங்கள் கையை நேராக நீட்டுங்கள், ரத்த அழுத்தத்தை பரிசோதிக்க போகிறேன்.',
        audioEn: 'Please stretch out your left arm so I can measure your blood pressure.'
      },
      {
        id: 'cmd_blood_draw',
        textTa: 'ஆய்வக பரிசோதனைக்காக முன்கையில் இருந்து சிறிது ரத்தம் எடுக்க வேண்டும்.',
        textEn: 'We need to draw a small blood sample from your arm for lab tests.',
        tslChain: ['blood_test'],
        audioTa: 'ஆய்வக பரிசோதனைக்காக முன்கையில் இருந்து சிறிது ரத்தம் எடுக்க வேண்டும்.',
        audioEn: 'We will draw a routine blood sample for diagnostic testing.'
      }
    ]
  },
  {
    category: 'rx_instructions',
    categoryNameTa: 'மருந்து சீட்டு மற்றும் அறிவுரைகள் (Prescriptions & Advice)',
    items: [
      {
        id: 'rx_after_food',
        textTa: 'இந்த மாத்திரையை காலை மற்றும் இரவு உணவு உண்ட பிறகு 1 மாத்திரை சாப்பிடவும்.',
        textEn: 'Take 1 tablet after food in the morning and night for 3 days.',
        tslChain: ['after_food', 'medicine_tablet', 'morning_afternoon_night'],
        audioTa: 'இந்த மாத்திரையை காலை மற்றும் இரவு உணவு உண்ட பிறகு ஒரு மாத்திரை சாப்பிடவும்.',
        audioEn: 'Take one tablet after breakfast and one after dinner.'
      },
      {
        id: 'rx_before_food',
        textTa: 'இந்த மாத்திரையை காலையில் எழுந்தவுடன் வெறும் வயிற்றில் சாப்பிட வேண்டும்.',
        textEn: 'Take this capsule in the morning on an empty stomach before food.',
        tslChain: ['before_food', 'medicine_tablet'],
        audioTa: 'இந்த மாத்திரையை காலையில் எழுந்தவுடன் வெறும் வயிற்றில் சாப்பிட வேண்டும்.',
        audioEn: 'Take this medicine first thing in the morning before eating breakfast.'
      },
      {
        id: 'rx_injection_shot',
        textTa: 'வலி குறைவதற்காக இப்போது ஒரு அவசர மருந்தூசி போடப்படும்.',
        textEn: 'An emergency analgesic injection will be administered for quick pain relief.',
        tslChain: ['injection'],
        audioTa: 'வலி குறைவதற்காக இப்போது ஒரு மருந்தூசி போடப்படும்.',
        audioEn: 'You will receive an injection now to relieve your symptoms.'
      },
      {
        id: 'rx_rest_hydrate',
        textTa: '3 நாட்களுக்கு கடுமையான வேலை செய்யாமல் ஓய்வெடுத்து சுடுநீர் அருந்துங்கள்.',
        textEn: 'Take complete rest for 3 days and drink plenty of warm fluids.',
        tslChain: ['rest_and_water'],
        audioTa: 'மூன்று நாட்களுக்கு கடுமையான வேலை செய்யாமல் ஓய்வெடுத்து சுடுநீர் அருந்துங்கள்.',
        audioEn: 'Rest adequately for the next three days and stay well-hydrated with boiled water.'
      }
    ]
  }
];

export const PRESCRIPTION_MEDICINES = [
  { id: 'para650', name: 'Paracetamol 650mg', indicationTa: 'காய்ச்சல் & தலைவலி', indicationEn: 'Fever & Pain Relief', defaultDosage: '1 tab Morning / Night (After Food)' },
  { id: 'pan40', name: 'Pantoprazole 40mg', indicationTa: 'வயிற்றுப்புண் & அசிடிட்டி', indicationEn: 'Gastric Acidity & Reflux', defaultDosage: '1 tab Morning (Before Food)' },
  { id: 'cet10', name: 'Cetirizine 10mg', indicationTa: 'ஒவ்வாமை, அரிப்பு & தும்மல்', indicationEn: 'Allergies, Itching & Rhinitis', defaultDosage: '1 tab Night (After Food)' },
  { id: 'amox500', name: 'Amoxicillin 500mg', indicationTa: 'தொண்டை தொற்று & பாக்டீரியா', indicationEn: 'Throat & Bacterial Infection', defaultDosage: '1 tab Morning & Night (After Food)' },
  { id: 'dolo650', name: 'Dolo 650mg', indicationTa: 'உடல் வலி & அதிக காய்ச்சல்', indicationEn: 'Body Ache & High Fever', defaultDosage: '1 tab Thrice Daily (After Food)' },
  { id: 'ors_sachet', name: 'ORS Electrolyte Sachet', indicationTa: 'வாந்தி, மயக்கம் & நீர்ச்சத்து குறைவு', indicationEn: 'Dehydration & Diarrhea/Vomiting', defaultDosage: 'Mix in 1L boiled water & drink frequently' },
  { id: 'cough_syrup', name: 'Cough Expectorant Syrup', indicationTa: 'வறட்டு இருமல் & நெஞ்சு சளி', indicationEn: 'Cough & Chest Congestion', defaultDosage: '10ml Thrice Daily (After Food)' }
];
