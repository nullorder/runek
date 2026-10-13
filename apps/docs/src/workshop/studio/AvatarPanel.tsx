import type { JsonValue } from '@runek/core/data'
import { PropsForm, SeedRow } from '../inspector/Inspector'
import { Panel } from '../panels/Panel'
import { setStudio, useWorkshop } from '../state/store'
import { Choice, optionsOf, Slider, Swatches, Tiles, TraitRow, useStudio } from './controls'
import { LayerStack } from './LayerStack'
import { shuffle } from './shuffle'
import { EYES, FASHION, HAIR, LIPS, SKIN } from './swatches'
import { TILE_BASE } from './tiles'
import { moreProps, TABS, type TabId } from './traits'

type Props = Record<string, JsonValue>

/** The figure as itself, before any clothes logic: for kind, skin, and style tiles. */
const IDENTITY: Props = {
  seed: 5,
  gender: 'neutral',
  skinTone: '#e0aa7e',
  hairColor: '#4a3122',
  hair: 'short',
  facialHair: 'none',
}

function Looks() {
  const { props, resolved, write, replace } = useStudio()
  const seeds = useWorkshop((s) => s.studio.seeds)
  const skin = typeof props.skin === 'string' ? props.skin : undefined
  return (
    <>
      <SeedRow
        seed={typeof props.seed === 'number' ? props.seed : undefined}
        onChange={(seed) => replace({ ...props, seed: seed ?? 1 }, 'studio:seed')}
      />
      <div className="ws-avatar__row">
        <button
          type="button"
          className={`ws-btn ws-btn--small ${seeds ? 'is-on' : ''}`}
          title="See the neighbouring seeds side by side"
          onClick={() =>
            setStudio({
              seeds: !seeds,
              seedBase: typeof props.seed === 'number' ? Math.max(1, props.seed - 4) : 1,
            })
          }
        >
          {seeds ? 'close the seed grid' : '3 × 3 seed grid'}
        </button>
      </div>
      <p className="ws-field__doc">
        The seed decides every trait you haven't set. Set one and it stays when the seed changes.
      </p>
      <TraitRow id="kind" hint="A role preset: outfit, hat, and accessories">
        <Tiles
          options={optionsOf('kind')}
          value={resolved.kind.value}
          base={IDENTITY}
          props={(kind) => ({ kind })}
          onPick={(kind) => write('kind', kind)}
        />
      </TraitRow>
      <TraitRow id="skin" hint="A cosmetic bundle: clothes, colors, hat, accessories">
        <Tiles
          options={optionsOf('skin')}
          value={skin}
          base={IDENTITY}
          props={(s) => ({ skin: s })}
          onPick={(s) => write('skin', s === skin ? undefined : s)}
        />
      </TraitRow>
    </>
  )
}

function Body() {
  const { resolved, write } = useStudio()
  return (
    <>
      <TraitRow id="style" hint="Proportions and face template">
        <Tiles
          options={optionsOf('style')}
          value={resolved.style.value}
          base={IDENTITY}
          props={(style) => ({ style })}
          onPick={(style) => write('style', style)}
        />
      </TraitRow>
      <TraitRow id="gender" hint="Silhouette cues only; everything it touches stays overridable">
        <Choice
          options={optionsOf('gender')}
          value={resolved.gender.value}
          onPick={(v) => write('gender', v)}
        />
      </TraitRow>
      <TraitRow id="age">
        <Choice
          options={optionsOf('age')}
          value={resolved.age.value}
          onPick={(v) => write('age', v)}
        />
      </TraitRow>
      <TraitRow id="build" hint="Limb thickness and torso depth">
        <Choice
          options={optionsOf('build')}
          value={resolved.build.value}
          onPick={(v) => write('build', v)}
        />
      </TraitRow>
      <TraitRow id="height" hint="Standing height in meters; every other measurement follows">
        <Slider
          value={resolved.height.value}
          min={0.6}
          max={2.2}
          step={0.01}
          onChange={(n) => write('height', n, 'studio:height')}
        />
      </TraitRow>
      <TraitRow id="tone">
        <Swatches
          colors={SKIN}
          value={resolved.tone.value}
          onPick={(c) => write('tone', c, 'studio:tone')}
        />
      </TraitRow>
    </>
  )
}

function Face() {
  const { resolved, write } = useStudio()
  return (
    <>
      <TraitRow id="eyeColor">
        <Swatches
          colors={EYES}
          value={resolved.eyeColor.value}
          onPick={(c) => write('eyeColor', c, 'studio:eyeColor')}
        />
      </TraitRow>
      <TraitRow id="eyeSize" hint="A multiplier on the style's eye size">
        <Slider
          value={resolved.eyeSize.value}
          min={0.6}
          max={1.6}
          step={0.01}
          onChange={(n) => write('eyeSize', n, 'studio:eyeSize')}
        />
      </TraitRow>
      <TraitRow id="browColor" hint="Defaults to the hair color">
        <Swatches
          colors={HAIR}
          value={resolved.browColor.value}
          onPick={(c) => write('browColor', c, 'studio:browColor')}
        />
      </TraitRow>
      <TraitRow id="browWeight">
        <Slider
          value={resolved.browWeight.value}
          min={0}
          max={1.6}
          step={0.01}
          onChange={(n) => write('browWeight', n, 'studio:browWeight')}
        />
      </TraitRow>
      <TraitRow id="nose">
        <Choice
          options={['button', 'straight', 'broad']}
          value={resolved.nose.value}
          onPick={(v) => write('nose', v)}
        />
      </TraitRow>
      <TraitRow id="lipColor">
        <Swatches
          colors={LIPS}
          value={resolved.lipColor.value}
          onPick={(c) => write('lipColor', c, 'studio:lipColor')}
        />
      </TraitRow>
      <TraitRow id="lipFullness">
        <Slider
          value={resolved.lipFullness.value}
          min={0.5}
          max={1.6}
          step={0.01}
          onChange={(n) => write('lipFullness', n, 'studio:lipFullness')}
        />
      </TraitRow>
      <TraitRow id="blush" hint="Cheek flush, 0 (none) to 1">
        <Slider
          value={resolved.blush.value}
          min={0}
          max={1}
          step={0.01}
          onChange={(n) => write('blush', n, 'studio:blush')}
        />
      </TraitRow>
      <TraitRow id="facialHair">
        <Tiles
          options={optionsOf('facialHair')}
          value={resolved.facialHair.value}
          crop="head"
          base={{ ...TILE_BASE, gender: 'masculine', hair: 'short' }}
          props={(facialHair) => ({ facialHair })}
          onPick={(v) => write('facialHair', v)}
        />
      </TraitRow>
    </>
  )
}

function Hair() {
  const { resolved, write } = useStudio()
  return (
    <>
      <TraitRow id="hair">
        <Tiles
          options={optionsOf('hair')}
          value={resolved.hair.value}
          crop="head"
          props={(hair) => ({ hair })}
          onPick={(v) => write('hair', v)}
        />
      </TraitRow>
      <TraitRow id="hairColor" hint="Also the brows' color unless you set those">
        <Swatches
          colors={HAIR}
          value={resolved.hairColor.value}
          onPick={(c) => write('hairColor', c, 'studio:hairColor')}
        />
      </TraitRow>
    </>
  )
}

function Clothes() {
  const { resolved, palette, write } = useStudio()
  const slots = [palette.fabric, palette.accent, palette.wall, palette.foliage]
  const lower = [palette.woodDark, palette.stone, palette.metal]
  return (
    <>
      <TraitRow id="outfit" hint="A one-word outfit that expands into layers">
        <Tiles
          options={optionsOf('outfit')}
          value={resolved.outfit.value}
          base={IDENTITY}
          props={(outfit) => ({ outfit, topColor: '#5b7fa3', bottomColor: '#3a3f47' })}
          onPick={(v) => write('outfit', v)}
        />
        {resolved.outfit.value === null && (
          <p className="ws-field__doc">Custom layers below replace the outfit.</p>
        )}
      </TraitRow>
      <TraitRow id="topColor" hint="Recolors the outermost top">
        <Swatches
          colors={[...slots, ...FASHION]}
          value={resolved.topColor.value}
          onPick={(c) => write('topColor', c, 'studio:topColor')}
        />
      </TraitRow>
      <TraitRow id="bottomColor" hint="Recolors every bottom">
        <Swatches
          colors={[...lower, ...FASHION]}
          value={resolved.bottomColor.value}
          onPick={(c) => write('bottomColor', c, 'studio:bottomColor')}
        />
      </TraitRow>
      <TraitRow id="shoeColor" hint="Recolors the footwear">
        <Swatches
          colors={[palette.metal, palette.woodDark, ...FASHION]}
          value={resolved.shoeColor.value}
          onPick={(c) => write('shoeColor', c, 'studio:shoeColor')}
        />
      </TraitRow>
      <TraitRow id="clothes" hint="Every layer, inner to outer">
        <LayerStack />
      </TraitRow>
    </>
  )
}

function Extras() {
  const { resolved, write } = useStudio()
  const worn = resolved.accessories.value
  const asLayers = new Set(['belt', 'scarf', 'cape'])
  return (
    <>
      <TraitRow id="hat">
        <Tiles
          options={optionsOf('hat')}
          value={resolved.hat.value}
          crop="head"
          props={(hat) => ({ hat })}
          onPick={(v) => write('hat', v)}
        />
      </TraitRow>
      <TraitRow id="accessories">
        <div className="ws-seg ws-seg--wrap">
          {optionsOf('accessories').map((a) => {
            const on = worn.includes(a as never)
            return (
              <button
                key={a}
                type="button"
                aria-pressed={on}
                className={on ? 'is-on' : ''}
                onClick={() =>
                  write('accessories', on ? worn.filter((w) => w !== a) : [...worn, a])
                }
              >
                {a}
              </button>
            )
          })}
        </div>
        <p className="ws-field__doc">
          A belt, scarf, or cape is worn as an outer clothing layer with the outfit; with custom
          layers, add it on the Clothes tab instead.
          {resolved.outfit.value === null && worn.some((w) => asLayers.has(w))
            ? ' (Custom layers are on, so it is not shown.)'
            : ''}
        </p>
      </TraitRow>
    </>
  )
}

function Pose() {
  const { props, write } = useStudio()
  const text = (id: 'bubble' | 'label', placeholder: string) => (
    <input
      className="ws-text"
      value={typeof props[id] === 'string' ? (props[id] as string) : ''}
      placeholder={placeholder}
      onChange={(e) => write(id, e.target.value || undefined, `studio:${id}`)}
    />
  )
  return (
    <>
      <TraitRow id="pose" hint="Sit and type get a stool on the platform">
        <Tiles
          options={optionsOf('pose')}
          value={props.pose ?? 'stand'}
          onPick={(v) => write('pose', v === 'stand' ? undefined : v)}
        />
      </TraitRow>
      <TraitRow id="emote">
        <Choice
          options={['none', ...optionsOf('emote')]}
          value={props.emote ?? 'none'}
          onPick={(v) => write('emote', v === 'none' ? undefined : v)}
        />
      </TraitRow>
      <TraitRow id="bubble">{text('bubble', 'What it is saying…')}</TraitRow>
      <TraitRow id="label">{text('label', 'A floating name')}</TraitRow>
      <TraitRow id="idle" hint="Breathing, weight shift, blinking">
        <Choice
          options={['on', 'off']}
          value={props.idle === false ? 'off' : 'on'}
          onPick={(v) => write('idle', v === 'off' ? false : undefined)}
        />
      </TraitRow>
      <TraitRow id="lookAt" hint="Turns its head toward the camera here, the avatar in a world">
        <Choice
          options={['on', 'off']}
          value={props.lookAt === false ? 'off' : 'on'}
          onPick={(v) => write('lookAt', v === 'off' ? false : undefined)}
        />
      </TraitRow>
    </>
  )
}

function More() {
  const { props, replace } = useStudio()
  return (
    <>
      <p className="ws-field__doc">
        Behavior and physics: routes, interaction, colliders, detail. The platform figure stands
        still, so these show in the scene, not here.
      </p>
      <PropsForm
        type="Person"
        props={props}
        scope="studio"
        only={moreProps()}
        onPatch={(patch, key) => {
          const next = { ...props }
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined) delete next[k]
            else next[k] = v
          }
          replace(next, key)
        }}
      />
    </>
  )
}

const CONTENT: Record<TabId, () => React.ReactNode> = {
  looks: Looks,
  body: Body,
  face: Face,
  hair: Hair,
  clothes: Clothes,
  extras: Extras,
  pose: Pose,
  more: More,
}

export function AvatarPanel() {
  const tab = useWorkshop((s) => s.studio.tab)
  const { props, replace } = useStudio()
  const Content = CONTENT[tab]
  const canShuffle = tab !== 'more'
  return (
    <Panel
      id="avatar"
      actions={
        canShuffle && (
          <button
            type="button"
            className="ws-btn ws-btn--small"
            title={
              tab === 'looks'
                ? 'A new seed'
                : `Shuffle this tab's traits only; the rest of the look holds`
            }
            onClick={() => replace(shuffle(tab, props))}
          >
            🎲 shuffle
          </button>
        )
      }
    >
      <div className="ws-avatar">
        <nav className="ws-avatar__tabs" aria-label="Avatar sections">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={tab === id}
              className={tab === id ? 'is-on' : ''}
              onClick={() => setStudio({ tab: id })}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="ws-avatar__body">
          <Content />
        </div>
      </div>
    </Panel>
  )
}
