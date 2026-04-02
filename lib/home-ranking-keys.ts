/** Chave SWR única: um fetch devolve músicas + artistas (cache 1h no servidor). */
export const HOME_RANKING_KEY = '/api/home/ranking'

/** @deprecated Use HOME_RANKING_KEY — mantido para não quebrar imports antigos. */
export const HOME_RANKING_SONGS_KEY = HOME_RANKING_KEY

/** @deprecated Use HOME_RANKING_KEY */
export const HOME_RANKING_ARTISTS_KEY = HOME_RANKING_KEY
