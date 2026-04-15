#!/bin/bash
# Backup de Railway → carpeta local backups/
# Uso: bash scripts/backup-railway.sh
# Recomendado: correr una vez a la semana o antes de cambios grandes

RAILWAY_URL="postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm"
BACKUP_DIR="$(dirname "$0")/../backups"
FECHA=$(date +"%Y-%m-%d_%H-%M")
ARCHIVO="$BACKUP_DIR/railway_$FECHA.sql"

mkdir -p "$BACKUP_DIR"

echo "Iniciando backup de Railway → $ARCHIVO"
pg_dump "$RAILWAY_URL" \
  --no-owner \
  --no-acl \
  --format=plain \
  --file="$ARCHIVO"

if [ $? -eq 0 ]; then
  SIZE=$(du -sh "$ARCHIVO" | cut -f1)
  echo "✅ Backup completado: $ARCHIVO ($SIZE)"
else
  echo "❌ Error en el backup"
  exit 1
fi

# Mantener solo los últimos 10 backups
cd "$BACKUP_DIR"
ls -t railway_*.sql | tail -n +11 | xargs rm -f 2>/dev/null
echo "Backups guardados: $(ls railway_*.sql 2>/dev/null | wc -l | tr -d ' ')"
