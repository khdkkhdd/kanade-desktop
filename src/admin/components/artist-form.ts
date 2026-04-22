// Shared state primitive for the "create new artist" form — used by both the
// drawer-style ArtistQuickAdd and the channel panel's ChannelArtistPicker.
// The two call-sites render different JSX (different themes) but drive the
// exact same field set: primary name, primary language, solo/group, and an
// expandable set of secondary-language names.
//
// Keeping the logic in one place avoids drift (e.g. a sticky-language fix
// or trim rule applied to only one of the two).

import { createSignal, type Accessor } from 'solid-js';
import type { ArtistNameInput, NewArtistInput } from '../types.js';
import { detectLanguage } from '../lang-detect.js';

export interface ArtistLangOption {
  code: string;
  label: string;
}

export const ARTIST_LANG_OPTIONS: readonly ArtistLangOption[] = [
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
];

export interface ArtistFormHandle {
  primaryName: Accessor<string>;
  primaryLang: Accessor<string>;
  type: Accessor<'solo' | 'group'>;
  secondaries: Accessor<ArtistNameInput[]>;
  expanded: Accessor<boolean>;
  availableLangs: Accessor<ArtistLangOption[]>;
  isValid: Accessor<boolean>;

  onPrimaryInput(value: string): void;
  setPrimaryLang(code: string): void;
  setType(type: 'solo' | 'group'): void;
  setExpanded(v: boolean): void;
  addSecondary(language: string): void;
  updateSecondary(index: number, name: string): void;
  removeSecondary(index: number): void;
  /** Wipe the form and optionally seed the primary name. */
  reset(initialName?: string): void;
  buildPayload(): NewArtistInput;
}

export function createArtistForm(initialName = ''): ArtistFormHandle {
  const [primaryName, setPrimaryName] = createSignal(initialName);
  const [primaryLang, setPrimaryLang] = createSignal(
    initialName ? detectLanguage(initialName) : 'ja',
  );
  const [type, setType] = createSignal<'solo' | 'group'>('solo');
  const [secondaries, setSecondaries] = createSignal<ArtistNameInput[]>([]);
  const [expanded, setExpanded] = createSignal(false);

  function onPrimaryInput(value: string) {
    // Auto-detect only on the transition from empty → non-empty so a manual
    // language pick isn't overwritten once the user starts typing (e.g.
    // typing "Hatsune Miku" as the English spelling of a ja artist mustn't
    // flip the language to en).
    const wasEmpty = primaryName() === '';
    setPrimaryName(value);
    if (wasEmpty && value !== '') setPrimaryLang(detectLanguage(value));
  }

  function addSecondary(language: string) {
    if (language === primaryLang()) return;
    if (secondaries().some((s) => s.language === language)) return;
    setSecondaries([...secondaries(), { name: '', language, isMain: false }]);
  }

  function updateSecondary(index: number, name: string) {
    setSecondaries(
      secondaries().map((s, i) => (i === index ? { ...s, name } : s)),
    );
  }

  function removeSecondary(index: number) {
    setSecondaries(secondaries().filter((_, i) => i !== index));
  }

  const availableLangs: Accessor<ArtistLangOption[]> = () =>
    ARTIST_LANG_OPTIONS.filter(
      (l) => l.code !== primaryLang() && !secondaries().some((s) => s.language === l.code),
    );

  const isValid: Accessor<boolean> = () => primaryName().trim().length > 0;

  function reset(next = '') {
    setPrimaryName(next);
    setPrimaryLang(next ? detectLanguage(next) : 'ja');
    setType('solo');
    setSecondaries([]);
    setExpanded(false);
  }

  function buildPayload(): NewArtistInput {
    const names: ArtistNameInput[] = [
      { name: primaryName().trim(), language: primaryLang(), isMain: true },
      ...secondaries()
        .filter((s) => s.name.trim())
        .map((s) => ({ ...s, name: s.name.trim() })),
    ];
    return { type: type(), names };
  }

  return {
    primaryName,
    primaryLang,
    type,
    secondaries,
    expanded,
    availableLangs,
    isValid,
    onPrimaryInput,
    setPrimaryLang,
    setType,
    setExpanded,
    addSecondary,
    updateSecondary,
    removeSecondary,
    reset,
    buildPayload,
  };
}
