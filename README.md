# Mattesammen

Enkel nettside for å stimulere til mengdetrening i matematikk i klasse-sammenheng.

* Elevene løser oppgaver i eget tempo på egne enheter (mobil/iPad/PC)
* Antall oppgaver alle har løst til sammen vises på administrator-skjerm, slik at alle ser det
* Antallet oppdateres fortløpende

## Bruk

1. Lærer går først til [administrasjons-sida](https://gangesammen.herokuapp.com/adm) og skriver inn navn på skole (for eksempel "Sted skole") og klasse (for eksempel "5A"). Skjermen som da kommer opp, kan elevene se på smartboard e.l.
2. Elevene går deretter til [https://gangesammen.herokuapp.com](gangesammen.herokuapp.com) og skriver inn klasse-kode (tall som står på administrasjons-skjermen) og navn eller nick
3. Elevene får da oppgaver som må løses fortløpende. Lærer kan velge å bruke stoppeklokke-funksjonen på administrasjons-skjermen til å ta tida.
4. Administrasjons-skjerm holdes automatisk oppdatert med navn på elevene som er inne og antall oppgaver klassen har løst til sammen.

Statistikk er basert på dato - dersom læreren skriver inn samme navn og klasse en annen dag, vil telleren starte på 0.

## Vanskelighetsnivå og individuell tilpasning

Mattestykkene blir automatisk generert basert på nivå. Alle elever starter på nivå 1, der oppgaven som skal løses er `1*1`. Etterhvert prøver systemet å unngå å repetere stykker eleven allerede har sett mange ganger.

Når en elev har løst "mange nok" stykker på et nivå og har nådd en akseptabel gjennomsnittshastighet per stykke på dette nivået, går hen opp til neste nivå. Progresjonen er rask i starten, det kreves mere etterhvert. Dette er ment å sikre individuell tilpasning av oppgaver hver enkelt må øve på.

## Personvern og datalagring

For å holde det enkelt, er det ingen passord for hverken administrator eller elever. Det betyr at dersom noen skriver inn samme klasse- og skolenavn på samme dag, vil de se antall stykker løst og navn på elevene. Av personvernhensyn kan elevene oppfordres til å bruke pseudonymer / nicknames.

Statistikk over hvor mange oppgaver hver elev har gjort, navn, nivå og gjennomsnittstid sendes fortløpende til server. Navn og antall oppgaver lagres. Foreløpig er det ingen måte læreren kan få tilgang til statistikken på.
