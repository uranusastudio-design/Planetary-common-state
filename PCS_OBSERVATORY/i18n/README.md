# PCS Observatory i18n

This folder contains static translation files for the PCS Observatory interface.

The current supported languages are:

- `en`: English
- `zh-TW`: Traditional Chinese
- `ja`: Japanese
- `ko`: Korean

All JSON files must keep identical keys. The frontend deep-merges the selected
dictionary over English, so missing keys and unavailable locale files fall back
to English without rendering `undefined`.

`../i18n.js` is the shared language state for the Landing page and Observatory.
It accepts only `en`, `zh-TW`, `ja`, and `ko`, and stores the explicit user
choice under the `pcs-language` localStorage key. English is the default when
the key is absent, invalid, or unavailable.
