// Utilidades de deduplicación de contactos por similitud de nombre
// Usadas en: routes/comuro.js, routes/public.js

function normalizarNombre(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').trim()
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}

// Compara dos nombres completos, retorna true si son similares (similitud >= 0.6)
function mismoNombre(nombre1, nombre2) {
  const s1 = normalizarNombre(nombre1)
  const s2 = normalizarNombre(nombre2)
  if (!s1 || !s2) return true
  const maxLen = Math.max(s1.length, s2.length)
  if (maxLen === 0) return true
  return (1 - levenshtein(s1, s2) / maxLen) >= 0.6
}

module.exports = { normalizarNombre, levenshtein, mismoNombre }
