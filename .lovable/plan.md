

# Trainingskalender: 3 Monate nebeneinander

## Aenderung

Der Trainingskalender zeigt die letzten 3 Monate nebeneinander an, statt nur den aktuellen Monat. Dazu wird der Kalender auf den Monat vor 2 Monaten gesetzt und 3 Monate gleichzeitig gerendert.

## Technische Umsetzung

**Datei: `src/components/training/TrainingCalendar.tsx`**

- `numberOfMonths={3}` an die `Calendar`-Komponente uebergeben (wird nativ von `react-day-picker` unterstuetzt)
- `defaultMonth` auf 2 Monate vor heute setzen, damit der aktuelle Monat rechts erscheint und die zwei vorherigen links daneben
- `pagedNavigation` aktivieren, damit die Navigation alle 3 Monate gleichzeitig verschiebt

Das sind insgesamt ca. 5 Zeilen Aenderung in einer einzigen Datei. Kein neues Package noetig.
