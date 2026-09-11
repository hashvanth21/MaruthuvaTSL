// Interactive Human Body Anatomical Mapping with TSL Sign Associations

export const BODY_REGIONS = [
  {
    id: 'head',
    nameTa: 'தலை மற்றும் மூளை (Head & Brain)',
    nameEn: 'Head / Brain / Scalp',
    associatedSigns: ['headache', 'dizziness', 'fever'],
    commonConditionsTa: 'தலைவலி, ஒற்றைத் தலைவலி, தலைசுற்றல், காய்ச்சல்',
    commonConditionsEn: 'Migraine, Throbbing headache, Vertigo, High temperature',
    doctorQueryTa: 'தலையில் எந்தப் பக்கம் வலிக்கிறது? கண் இருட்டுகிறதா?',
    doctorQueryEn: 'Which side of your head hurts? Is your vision dimming?'
  },
  {
    id: 'eyes_ears',
    nameTa: 'கண் மற்றும் காதுகள் (Eyes & Ears)',
    nameEn: 'Eyes, Ears & Sinuses',
    associatedSigns: ['eye_ear_pain', 'headache'],
    commonConditionsTa: 'கண் எரிச்சல், காது சீழ்/வலி, கேட்கும் குறைபாடு',
    commonConditionsEn: 'Eye redness, Ear discharge/pain, Hearing discomfort',
    doctorQueryTa: 'கண் சிவந்துள்ளதா அல்லது காதில் இரைச்சல் உள்ளதா?',
    doctorQueryEn: 'Is there redness in your eyes or ringing/pain in your ears?'
  },
  {
    id: 'throat',
    nameTa: 'தொண்டை மற்றும் வாய் (Throat & Mouth)',
    nameEn: 'Throat, Mouth & Vocal Cords',
    associatedSigns: ['cough', 'vomiting', 'open_mouth_tongue'],
    commonConditionsTa: 'தொண்டை வலி, விழுங்க சிரமம், வறட்டு இருமல், வாந்தி',
    commonConditionsEn: 'Pharyngitis, Difficulty swallowing, Cough, Nausea',
    doctorQueryTa: 'எச்சில் விழுங்கும் போது தொண்டையில் முள் குத்துவது போல் வலிக்கிறதா?',
    doctorQueryEn: 'Does your throat hurt when swallowing liquids or saliva?'
  },
  {
    id: 'chest',
    nameTa: 'நெஞ்சு மற்றும் நுரையீரல் (Chest, Heart & Lungs)',
    nameEn: 'Chest, Heart & Respiratory',
    associatedSigns: ['chest_pain', 'breathlessness', 'breathe_deeply', 'emergency_sos'],
    commonConditionsTa: 'நெஞ்சு இறுக்கம், மூச்சுத்திணறல், ஆஸ்துமா, படபடப்பு',
    commonConditionsEn: 'Angina, Dyspnea, Asthma, Palpitations',
    doctorQueryTa: 'நெஞ்சில் பாரம் அல்லது இறுக்கம் உள்ளதா? மூச்சு வாங்குகிறதா?',
    doctorQueryEn: 'Is there heavy pressure or tightness in your chest?'
  },
  {
    id: 'stomach',
    nameTa: 'வயிறு மற்றும் குடல் (Stomach & Gastrointestinal)',
    nameEn: 'Stomach & Abdomen',
    associatedSigns: ['stomach_pain', 'vomiting', 'after_food'],
    commonConditionsTa: 'வயிற்று வலி, குடல் பிடிப்பு, அசிடிட்டி, வாந்தி',
    commonConditionsEn: 'Gastritis, Abdominal colic, Nausea, Food poisoning',
    doctorQueryTa: 'சாப்பிட்ட பிறகு வலி அதிகரிக்கிறதா அல்லது வெறும் வயிற்றில் வலிக்கிறதா?',
    doctorQueryEn: 'Does the pain worsen after eating or on an empty stomach?'
  },
  {
    id: 'arms_hands',
    nameTa: 'கைகள் மற்றும் மணிக்கட்டு (Arms, Shoulders & Hands)',
    nameEn: 'Arms, Shoulders & Upper Extremities',
    associatedSigns: ['fracture', 'allergy', 'blood_pressure', 'blood_test'],
    commonConditionsTa: 'எலும்பு முறிவு, கை நடுக்கம், மூட்டு வலி, தோல் அரிப்பு தடிப்பு',
    commonConditionsEn: 'Fracture, Joint sprain, Urticaria/Itching, Numbness',
    doctorQueryTa: 'கையை அசைக்க முடிகிறதா? வீக்கம் அல்லது முறிவு உள்ளதா?',
    doctorQueryEn: 'Can you move your fingers and arm without sharp pain?'
  },
  {
    id: 'back_spine',
    nameTa: 'முதுகு மற்றும் தண்டுவடம் (Back & Spine)',
    nameEn: 'Back, Lumbar & Spine',
    associatedSigns: ['severe_pain', 'rest_and_water'],
    commonConditionsTa: 'கீழ் முதுகு வலி, தண்டுவட தசைப்பிடிப்பு, கூன் வலி',
    commonConditionsEn: 'Lower back ache, Muscle spasm, Disc stiffness',
    doctorQueryTa: 'குனியும்போது அல்லது நடக்கும்போது முதுகு வலி அதிகமாகிறதா?',
    doctorQueryEn: 'Does the pain shoot down when bending or walking?'
  },
  {
    id: 'legs_knees',
    nameTa: 'கால்கள் மற்றும் முழங்கால் (Legs & Knees)',
    nameEn: 'Legs, Knees & Feet',
    associatedSigns: ['fracture', 'severe_pain', 'diabetes'],
    commonConditionsTa: 'முழங்கால் வீக்கம், சர்க்கரை நோய் கால் எரிச்சல், சுளுக்கு',
    commonConditionsEn: 'Knee swelling, Diabetic neuropathy, Ankle sprain',
    doctorQueryTa: 'காலில் வீக்கம் உள்ளதா? பாதத்தில் உணர்வின்மை அல்லது எரிச்சல் உள்ளதா?',
    doctorQueryEn: 'Is there swelling in your feet or tingling/burning sensation?'
  }
];
