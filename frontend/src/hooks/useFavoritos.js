import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import api from '../services/api'

const CLAVE = ['leads-favoritos']

// Clientes favoritos del usuario actual. Todas las estrellas comparten este caché.
export function useFavoritos() {
  const qc = useQueryClient()
  const { message } = App.useApp()

  const { data: favoritos = [], isLoading } = useQuery({
    queryKey: CLAVE,
    queryFn: () => api.get('/leads/favoritos').then(r => r.data),
  })

  const ids = useMemo(() => new Set(favoritos.map(f => f.id)), [favoritos])

  const alternar = useMutation({
    mutationFn: ({ leadId, marcar }) =>
      marcar ? api.put(`/leads/${leadId}/favorito`) : api.delete(`/leads/${leadId}/favorito`),
    onError: (err) => message.error(err.response?.data?.error || 'No se pudo actualizar el favorito'),
    // Devuelve la promesa para que isPending dure hasta tener la lista nueva
    onSettled: () => qc.invalidateQueries({ queryKey: CLAVE }),
  })

  return { favoritos, ids, isLoading, alternar }
}
