import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

export function useUF() {
  const { data } = useQuery({
    queryKey: ['uf'],
    queryFn: () => api.get('/uf').then(r => r.data),
    staleTime: 1000 * 60 * 60, // 1 hora
    retry: false
  })

  const ufAPesos = (uf) => {
    if (!data?.valorPesos || !uf) return null
    return Math.round(uf * data.valorPesos)
  }

  const formatUF = (uf) => uf ? `${uf.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UF` : '-'

  const formatPesos = (pesos) => pesos
    ? `$${Math.round(pesos).toLocaleString('es-CL')}`
    : '-'

  return { valorUF: data?.valorPesos, ufAPesos, formatUF, formatPesos }
}
