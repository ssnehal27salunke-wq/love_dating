const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Profile extends Model {}

Profile.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  // Personal details
  bio: { type: DataTypes.TEXT, validate: { len: [0, 500] } },
  height_cm: { type: DataTypes.INTEGER },
  weight_kg: { type: DataTypes.INTEGER },
  body_type: { type: DataTypes.ENUM('slim', 'average', 'athletic', 'heavy') },
  complexion: { type: DataTypes.ENUM('very_fair', 'fair', 'wheatish', 'dark') },
  // Cultural / Religious
  religion: {
    type: DataTypes.ENUM(
      'hindu', 'muslim', 'christian', 'sikh', 'jain',
      'buddhist', 'jewish', 'parsi', 'other', 'no_religion'
    ),
  },
  caste: { type: DataTypes.STRING(100) },
  sub_caste: { type: DataTypes.STRING(100) },
  mother_tongue: { type: DataTypes.STRING(100) },
  languages_known: { type: DataTypes.JSONB, defaultValue: [] },
  // Education & Career
  education_level: {
    type: DataTypes.ENUM('high_school', 'diploma', 'bachelors', 'masters', 'phd', 'other'),
  },
  education_detail: { type: DataTypes.STRING(200) },
  college: { type: DataTypes.STRING(200) },
  profession: {
    type: DataTypes.ENUM(
      'software_engineer', 'doctor', 'lawyer', 'teacher', 'business',
      'government', 'artist', 'finance', 'healthcare', 'military',
      'student', 'self_employed', 'other'
    ),
  },
  profession_detail: { type: DataTypes.STRING(200) },
  company: { type: DataTypes.STRING(200) },
  annual_income_usd: { type: DataTypes.INTEGER },
  // Family details
  family_type: { type: DataTypes.ENUM('nuclear', 'joint', 'extended') },
  family_status: { type: DataTypes.ENUM('middle_class', 'upper_middle', 'rich', 'affluent') },
  family_values: { type: DataTypes.ENUM('traditional', 'moderate', 'liberal') },
  fathers_occupation: { type: DataTypes.STRING(200) },
  mothers_occupation: { type: DataTypes.STRING(200) },
  num_brothers: { type: DataTypes.INTEGER, defaultValue: 0 },
  num_sisters: { type: DataTypes.INTEGER, defaultValue: 0 },
  // Lifestyle
  diet: { type: DataTypes.ENUM('vegetarian', 'non_vegetarian', 'vegan', 'jain_vegetarian', 'eggetarian') },
  smoking: { type: DataTypes.ENUM('never', 'occasionally', 'regularly') },
  drinking: { type: DataTypes.ENUM('never', 'occasionally', 'regularly') },
  hobbies: { type: DataTypes.JSONB, defaultValue: [] },
  interests: { type: DataTypes.JSONB, defaultValue: [] },
  // Marital history
  marital_status: {
    type: DataTypes.ENUM('never_married', 'divorced', 'widowed', 'separated'),
    defaultValue: 'never_married',
  },
  have_children: { type: DataTypes.BOOLEAN, defaultValue: false },
  num_children: { type: DataTypes.INTEGER, defaultValue: 0 },
  // Horoscope
  horoscope_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  rashi: { type: DataTypes.STRING(50) },
  nakshatra: { type: DataTypes.STRING(50) },
  manglik: { type: DataTypes.ENUM('yes', 'no', 'partial', 'unknown') },
  birth_time: { type: DataTypes.TIME },
  birth_place: { type: DataTypes.STRING(200) },
  // Partner preferences
  partner_age_min: { type: DataTypes.INTEGER },
  partner_age_max: { type: DataTypes.INTEGER },
  partner_height_min: { type: DataTypes.INTEGER },
  partner_height_max: { type: DataTypes.INTEGER },
  partner_religion: { type: DataTypes.JSONB, defaultValue: [] },
  partner_caste: { type: DataTypes.JSONB, defaultValue: [] },
  partner_education: { type: DataTypes.JSONB, defaultValue: [] },
  partner_profession: { type: DataTypes.JSONB, defaultValue: [] },
  partner_location: { type: DataTypes.JSONB, defaultValue: [] },
  partner_diet: { type: DataTypes.JSONB, defaultValue: [] },
  partner_marital_status: { type: DataTypes.JSONB, defaultValue: ['never_married'] },
  partner_preferences_text: { type: DataTypes.TEXT },
  // AI score
  ai_compatibility_vector: { type: DataTypes.JSONB },
  profile_score: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0 },
}, {
  sequelize,
  modelName: 'Profile',
  tableName: 'profiles',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['religion'] },
    { fields: ['marital_status'] },
    { fields: ['profession'] },
  ],
});

module.exports = Profile;
