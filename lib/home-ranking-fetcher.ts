export async function homeRankingFetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Falha ao carregar')
  return res.json()
}
