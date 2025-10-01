-- Migración: Crear tabla inventario_sim_turno
-- Fecha: 2025-09-26
-- Descripción: Tabla para registrar inventarios de SIMs por turno y plan

-- Crear tabla inventario_sim_turno
CREATE TABLE inventario_sim_turno (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_id UUID NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,

    -- Plan de SIMs (R5, R7, R15, R30, etc.)
    plan VARCHAR(10) NOT NULL,

    -- Inventario reportado por el asesor al abrir turno
    cantidad_inicial_reportada INTEGER NOT NULL DEFAULT 0,

    -- Inventario reportado por el asesor al cerrar turno
    cantidad_final_reportada INTEGER,

    -- Inventario calculado por el sistema al abrir turno
    cantidad_inicial_sistema INTEGER NOT NULL DEFAULT 0,

    -- Inventario calculado por el sistema al cerrar turno
    cantidad_final_sistema INTEGER,

    -- Diferencias calculadas automáticamente
    diferencia_inicial INTEGER GENERATED ALWAYS AS (cantidad_inicial_reportada - cantidad_inicial_sistema) STORED,
    diferencia_final INTEGER,

    -- Timestamps
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_cierre TIMESTAMPTZ,

    -- Observaciones del asesor
    observaciones_apertura TEXT,
    observaciones_cierre TEXT,

    -- Índices para mejorar performance
    CONSTRAINT inventario_sim_turno_unique_turno_plan UNIQUE (turno_id, plan)
);

-- Crear índices para optimizar consultas
CREATE INDEX idx_inventario_sim_turno_fecha_registro ON inventario_sim_turno(fecha_registro);
CREATE INDEX idx_inventario_sim_turno_plan ON inventario_sim_turno(plan);
CREATE INDEX idx_inventario_sim_turno_diferencias ON inventario_sim_turno(diferencia_inicial, diferencia_final);
CREATE INDEX idx_inventario_sim_turno_turno_id ON inventario_sim_turno(turno_id);

-- Comentarios sobre la tabla
COMMENT ON TABLE inventario_sim_turno IS 'Registro de inventarios de SIMs por turno y plan para control de descuadres';
COMMENT ON COLUMN inventario_sim_turno.plan IS 'Plan de las SIMs (R5, R7, R15, R30, etc.)';
COMMENT ON COLUMN inventario_sim_turno.cantidad_inicial_reportada IS 'Cantidad reportada por el asesor al abrir turno';
COMMENT ON COLUMN inventario_sim_turno.cantidad_inicial_sistema IS 'Cantidad calculada por el sistema al abrir turno';
COMMENT ON COLUMN inventario_sim_turno.diferencia_inicial IS 'Diferencia entre cantidad reportada y sistema al abrir (generada automáticamente)';
COMMENT ON COLUMN inventario_sim_turno.diferencia_final IS 'Diferencia entre cantidad reportada y sistema al cerrar';