import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

/**
 * Retorna el valor de la UF para una fecha específica.
 * @param {string|null} fecha - Formato 'YYYY-MM-DD'. null/undefined → no hace fetch.
 * @returns {{ valorUF: number|null, isLoading: boolean }}
 */
export function useUFPorFecha(fecha) {
  const { data, isLoading } = useQuery({
    queryKey: ['uf', fecha],
    queryFn: () => api.get('/uf', { params: { fecha } }).then(r => r.data),
    enabled: Boolean(fecha && fecha.length === 10),
    staleTime: 1000 * 60 * 60 * 24, // 24h — UF histórica no cambia
    retry: false,
  })

  return {
    valorUF: data?.valorPesos ?? null,
    isLoading,
  }
}
