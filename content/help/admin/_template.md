---
# REQUIRED FIELDS — fill in for every article
id: category-short-slug           # unique across all articles, e.g. settings-business-info
title: Short, task-focused title  # verb-noun preferred, e.g. "Configure business information"
audience: admin                   # admin | instructor | student (or comma list)
category: settings                # settings | users | packages | bookings | overview
order: 1                          # display order within the category; lower = first

# ROUTING — used for future contextual ("help on this page") linking
uiRoute: /admin/settings          # the Vue route the user is on when this article is relevant
uiTab: business                   # optional: which Settings tab or modal tab this maps to

# METADATA
relatedComponents: []             # Vue component filenames this article documents
sources: []                       # existing /docs/*.md files used as source material
keywords: []                      # words a user might search for
---

# Article Title

One sentence describing what this feature/task does and why an admin would use it.

## Where to find it

> Settings → Business Information (example nav path)

## Steps

1. Step one.
2. Step two.
3. Step three.

## Notes

- Any important limits, rules, or caveats (e.g. "Changes take effect immediately").
- Required fields, format requirements, or permission notes.

<!-- AUTHOR NOTES (remove before publishing):
- Source doc(s): list which /docs files were used
- Screenshot placeholder: [describe what screen to capture]
- Outstanding questions: anything that needs verification against the live UI
-->
