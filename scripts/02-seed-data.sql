-- Insert specialties
INSERT INTO specialties (name) VALUES
  ('Internal Medicine'),
  ('Surgery'),
  ('Pediatrics'),
  ('OB/GYN'),
  ('Public Health'),
  ('Minor Specialties');

-- Insert exam types
INSERT INTO exam_types (name) VALUES
  ('Exit Exam'),
  ('COC');

-- Insert lab values
INSERT INTO lab_values (category, test_name, reference_range, units) VALUES
  ('Serum', 'Sodium', '136-145', 'mEq/L'),
  ('Serum', 'Potassium', '3.5-5.0', 'mEq/L'),
  ('Serum', 'Chloride', '98-107', 'mEq/L'),
  ('Serum', 'BUN', '7-20', 'mg/dL'),
  ('Serum', 'Creatinine', '0.6-1.2', 'mg/dL'),
  ('Cerebrospinal', 'Cell count', '0-5', '/mm³'),
  ('Cerebrospinal', 'Chloride', '118-132', 'mEq/L'),
  ('Cerebrospinal', 'Gamma globulin', '3%-12%', 'total proteins'),
  ('Cerebrospinal', 'Glucose', '40-70', 'mg/dL'),
  ('Cerebrospinal', 'Pressure', '70-180', 'mm H₂O'),
  ('Cerebrospinal', 'Proteins, total', '<40', 'mg/dL'),
  ('Blood', 'Hemoglobin (Male)', '14-18', 'g/dL'),
  ('Blood', 'Hemoglobin (Female)', '12-16', 'g/dL'),
  ('Blood', 'Hematocrit (Male)', '42-52', '%'),
  ('Blood', 'Hematocrit (Female)', '37-47', '%'),
  ('Urine and BMI', 'Specific Gravity', '1.003-1.030', ''),
  ('Urine and BMI', 'pH', '4.6-8.0', ''),
  ('Urine and BMI', 'BMI Normal', '18.5-24.9', 'kg/m²');
