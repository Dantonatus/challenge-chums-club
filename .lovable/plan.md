

# Rich-Text-Editor: Bugfixes + Schriftart & Schriftgroesse

## Alle Aenderungen in einer Datei

`src/components/planning/gantt/RichTextEditor.tsx`

## 1. Bugfixes (aus vorheriger Analyse)

### Cursor springt beim Loeschen / Paste
- Die zwei identischen `useEffect`-Hooks werden zu einem zusammengefuehrt
- Neuer `lastValueRef` speichert den zuletzt intern gesetzten Wert
- `innerHTML` wird nur ueberschrieben wenn der Wert wirklich extern geaendert wurde (z.B. Task-Wechsel), nicht bei eigenen Eingaben
- `onPaste`-Handler fuegt nur Plaintext ein (`document.execCommand('insertText')`)

### Tab fuer Untergliederung
- `onKeyDown`-Handler: Tab = `indent` (Unterpunkt erstellen), Shift+Tab = `outdent`

## 2. Schriftart-Auswahl (neu)

- Neues `<Select>`-Dropdown in der Toolbar mit gaengigen Schriftarten:
  - Sans-serif (Standard), Serif, Monospace, Arial, Georgia, Verdana
- Nutzt `document.execCommand('fontName', false, schriftart)` um die Schrift auf die aktuelle Selektion anzuwenden
- Kompaktes Dropdown passend zur bestehenden Toolbar-Optik

## 3. Schriftgroesse-Auswahl (neu)

- Zweites `<Select>`-Dropdown fuer Schriftgroessen:
  - Klein, Normal, Gross, Sehr gross (entspricht `fontSize` 1-4 bzw. via `<font size>`)
- Alternativ wird `formatBlock` mit Heading-Tags (p, h3, h2, h1) verwendet, da `fontSize` mit numerischen Werten arbeitet die browserspezifisch sind
- Optionen: Normal (p), Ueberschrift 3 (h3), Ueberschrift 2 (h2), Ueberschrift 1 (h1)

## Toolbar-Layout (nach Umbau)

```text
[ Schriftart v ] [ Groesse v ] | B I U | • 1. |
```

- Schriftart und Groesse links als Dropdowns
- Dann Trennlinie, dann die bestehenden Formatierungsbuttons
- Alles in einer Zeile, responsive mit flex-wrap

## Technische Details

- Alle Aenderungen nur in `RichTextEditor.tsx`
- Dropdowns verwenden einfache native `<select>`-Elemente (kein Radix Select noetig, da innerhalb von contentEditable-Kontext einfacher)
- Styling passend zur bestehenden Toolbar (gleiche Hoehe, Border, Muted-Background)
- `exec`-Funktion wird wiederverwendet fuer `fontName` und `formatBlock`

