import { Button, Tooltip } from 'antd'
import { StarFilled, StarOutlined } from '@ant-design/icons'
import { useFavoritos } from '../hooks/useFavoritos'

export default function BotonFavorito({ leadId }) {
  const { ids, alternar } = useFavoritos()

  // Mientras se guarda muestra el valor nuevo, sin esperar al servidor
  const marcado = alternar.isPending ? alternar.variables.marcar : ids.has(leadId)
  const etiqueta = marcado ? 'Quitar de favoritos' : 'Marcar como favorito'

  return (
    <Tooltip title={etiqueta}>
      <Button
        type="text"
        size="small"
        aria-label={etiqueta}
        aria-pressed={marcado}
        icon={marcado ? <StarFilled style={{ color: '#f59e0b' }} /> : <StarOutlined style={{ color: '#94a3b8' }} />}
        onClick={(e) => {
          // Dentro de filas y tarjetas clickeables no debe abrir el lead
          e.stopPropagation()
          if (!alternar.isPending) alternar.mutate({ leadId, marcar: !marcado })
        }}
      />
    </Tooltip>
  )
}
