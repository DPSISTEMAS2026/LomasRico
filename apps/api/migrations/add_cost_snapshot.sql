-- Agrega las 3 columnas de control de costos al RecipeSnapshot
-- Esto permite registrar el costo real de cada venta, congelado en el tiempo

ALTER TABLE "RecipeSnapshot"
  ADD COLUMN IF NOT EXISTS "costSnapshot"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "priceSnapshot" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "costBreakdown" JSONB;

-- Comentario para documentar el propósito
COMMENT ON COLUMN "RecipeSnapshot"."costSnapshot" IS 
  'Costo total de producción congelado al momento de la venta. Suma de (qty × costPerUnit) de todos los ingredientes del BOM (base + proteínas seleccionadas).';

COMMENT ON COLUMN "RecipeSnapshot"."priceSnapshot" IS 
  'Precio de venta al cliente congelado al momento de la venta. Copiado de SaleItem.priceUnit.';

COMMENT ON COLUMN "RecipeSnapshot"."costBreakdown" IS 
  'Desglose de costos por rol. Formato: { "proteinas": 4500, "base": 320, "verduras": 180, "otros": 0 }';
