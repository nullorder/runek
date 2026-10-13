import type { JsonValue } from '@runek/core/data'
import { optionsOf } from './controls'
import { EYES, FASHION, HAIR, LIPS, SKIN } from './swatches'
import { type TabId, type TraitId, writeTrait } from './traits'

type Props = Record<string, JsonValue>

const any = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]
const between = (min: number, max: number) =>
  Math.round((min + Math.random() * (max - min)) * 100) / 100

/** New values for one tab's traits, written explicitly so the rest of the look holds. The Looks
 *  tab rolls the seed instead, which reshuffles everything not set. */
export function shuffle(tab: TabId, props: Props): Props {
  if (tab === 'looks') return { ...props, seed: 1 + Math.floor(Math.random() * 9999) }
  const picks: [TraitId, JsonValue | undefined][] =
    tab === 'body'
      ? [
          ['gender', any(optionsOf('gender'))],
          ['build', any(optionsOf('build'))],
          ['tone', any(SKIN)],
          ['height', undefined],
        ]
      : tab === 'face'
        ? [
            ['eyeColor', any(EYES)],
            ['eyeSize', between(0.85, 1.25)],
            ['browWeight', between(0.5, 1.1)],
            ['nose', any(['button', 'straight', 'broad'])],
            ['lipColor', Math.random() < 0.5 ? undefined : any(LIPS)],
            ['lipFullness', between(0.8, 1.3)],
            ['blush', between(0, 0.8)],
            ['facialHair', Math.random() < 0.6 ? 'none' : any(optionsOf('facialHair'))],
          ]
        : tab === 'hair'
          ? [
              ['hair', any(optionsOf('hair'))],
              ['hairColor', any(HAIR)],
            ]
          : tab === 'clothes'
            ? [
                ['clothes', undefined],
                ['outfit', any(optionsOf('outfit'))],
                ['topColor', any(FASHION)],
                ['bottomColor', any(FASHION)],
                ['shoeColor', undefined],
              ]
            : tab === 'extras'
              ? [
                  ['hat', any(optionsOf('hat'))],
                  ['accessories', optionsOf('accessories').filter(() => Math.random() < 0.25)],
                ]
              : [['pose', any(optionsOf('pose').filter((p) => p !== 'lie'))]]
  return picks.reduce((next, [id, value]) => writeTrait(next, id, value), props)
}
