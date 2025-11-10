-- Migración para agregar el módulo de eSIMs
-- Fecha: 2025-01-04
-- Descripción: Agrega el módulo "eSims" a la tabla de módulos para el sistema de permisos

-- 1. Insertar el módulo de eSIMs si no existe
INSERT INTO modules (name)
SELECT 'eSims'
WHERE NOT EXISTS (
    SELECT 1 FROM modules WHERE name = 'eSims'
);

-- 2. Obtener el ID del módulo de eSIMs
-- (Este paso es para uso manual si necesitas asignar permisos específicos)
-- SELECT id FROM modules WHERE name = 'eSims';

-- 3. Asignar el módulo de eSIMs a los roles que deberían tener acceso
-- Ejemplo: Asignar a rol de Administrador (asumiendo role_id = 1)
-- DESCOMENTAR Y AJUSTAR SEGÚN TUS NECESIDADES:

-- INSERT INTO role_modules (role_id, module_id)
-- SELECT 1, m.id
-- FROM modules m
-- WHERE m.name = 'eSims'
-- AND NOT EXISTS (
--     SELECT 1 FROM role_modules rm
--     WHERE rm.role_id = 1 AND rm.module_id = m.id
-- );

-- Para ver todos los roles existentes:
-- SELECT * FROM roles;

-- Para asignar a todos los roles con acceso a "Sims" (similar):
-- INSERT INTO role_modules (role_id, module_id)
-- SELECT DISTINCT rm.role_id, m_esims.id
-- FROM role_modules rm
-- JOIN modules m_sims ON rm.module_id = m_sims.id
-- CROSS JOIN modules m_esims
-- WHERE m_sims.name = 'Sims'
--   AND m_esims.name = 'eSims'
--   AND NOT EXISTS (
--       SELECT 1 FROM role_modules rm2
--       WHERE rm2.role_id = rm.role_id AND rm2.module_id = m_esims.id
--   );

-- Verificar que el módulo fue creado:
-- SELECT * FROM modules WHERE name = 'eSims';

COMMIT;
