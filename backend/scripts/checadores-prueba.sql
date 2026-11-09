-- Base de checadores de PRUEBA, con la misma forma que la real (solo las columnas que usa el sistema).
-- La real vive en el servidor de los biometricos. Aqui las checadas se agregan a mano para probar:
--   INSERT INTO iclock_transaction (emp_code, terminal_id, punch_time, terminal_alias)
--   VALUES ('1001', 1, NOW(), 'D1-PER-OSFEM-MAT');
-- Ojo: en la base real, personnel_employee.first_name guarda el RFC de la persona.
CREATE TABLE IF NOT EXISTS iclock_transaction (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  emp_code VARCHAR(20) NULL,
  terminal_id INT NULL,
  punch_time DATETIME NULL,
  terminal_alias VARCHAR(50) NULL
);

CREATE TABLE IF NOT EXISTS personnel_employee (
  emp_code VARCHAR(20) NOT NULL PRIMARY KEY,
  first_name VARCHAR(50) NULL
);
