import { StyleSheet, Text, View } from 'react-native'
import { colors } from '@/constants/theme'

type Props = {
  frets?: number[] | unknown
  fingering?: number[] | unknown
  barres?: { fromString: number; toString: number; fret: number }[]
}

function asNumberArray(v: unknown): number[] {
  if (!Array.isArray(v)) return []
  return v.map((n) => (typeof n === 'number' ? n : Number(n))).filter((n) => !Number.isNaN(n))
}

/**
 * Diagrama simples de violão (6 cordas).
 * frets[i]: -1 mute, 0 open, >0 casa — índice 0 = corda mais grave (E6).
 */
export function ChordDiagram({ frets: fretsRaw, fingering: fingeringRaw }: Props) {
  const frets = asNumberArray(fretsRaw)
  const fingering = asNumberArray(fingeringRaw)
  if (frets.length < 4) {
    return (
      <Text style={styles.fallback}>
        Frets: {JSON.stringify(fretsRaw)}
        {'\n'}
        Dedos: {JSON.stringify(fingeringRaw)}
      </Text>
    )
  }

  const pressed = frets.filter((f) => f > 0)
  const baseFret = pressed.length ? Math.max(1, Math.min(...pressed)) : 1
  const showBase = baseFret > 1
  const fretCount = 5
  const stringCount = frets.length

  return (
    <View style={styles.wrap}>
      <View style={styles.nutRow}>
        {frets.map((f, i) => (
          <View key={`m-${i}`} style={styles.markerCell}>
            <Text style={styles.marker}>
              {f < 0 ? '×' : f === 0 ? '○' : ' '}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.grid}>
        {showBase ? (
          <Text style={styles.baseFret}>{baseFret}ª</Text>
        ) : (
          <View style={[styles.nutBar, { width: CELL * stringCount }]} />
        )}
        {Array.from({ length: fretCount }, (_, fretIdx) => {
          const absoluteFret = showBase ? baseFret + fretIdx : fretIdx + 1
          return (
            <View
              key={fretIdx}
              style={[styles.fretRow, { width: CELL * stringCount }]}
            >
              {Array.from({ length: stringCount }, (_, s) => {
                const f = frets[s]
                const finger = fingering[s]
                const active = f === absoluteFret
                return (
                  <View key={s} style={styles.stringCell}>
                    <View style={styles.stringLine} />
                    {active ? (
                      <View style={styles.dot}>
                        {finger > 0 ? (
                          <Text style={styles.dotText}>{finger}</Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                )
              })}
              <View style={styles.fretLine} />
            </View>
          )
        })}
      </View>
    </View>
  )
}

const CELL = 28

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: 8 },
  nutRow: { flexDirection: 'row', marginBottom: 4 },
  markerCell: { width: CELL, alignItems: 'center' },
  marker: { fontSize: 14, fontWeight: '700', color: colors.text },
  grid: { position: 'relative' },
  nutBar: {
    height: 4,
    backgroundColor: colors.text,
    marginBottom: 0,
    alignSelf: 'center',
  },
  baseFret: {
    position: 'absolute',
    left: -28,
    top: 8,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  fretRow: {
    flexDirection: 'row',
    height: CELL,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: 'relative',
  },
  stringCell: {
    width: CELL,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stringLine: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: '#9ca3af',
  },
  fretLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: colors.border,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dotText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  fallback: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: colors.text,
  },
})
