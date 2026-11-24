# Client requests in the interface

| Request                             | Where                                                                 |
| ----------------------------------- | --------------------------------------------------------------------- |
| R03 show and hide the password      | `components/PasswordInput.tsx`, in sign-in, registration and reset    |
| R06 map with latitude and longitude | `components/location/`, for projects and terrains                     |
| R07 200 characters                  | `components/TextField.tsx`, `utils/limits.ts`                         |
| R08 fill in from a PDF, PNG or JPG  | `components/extraction/`, in the Terrain section of a project         |
| R09 one modal system                | `components/modal/`; no `window.confirm`, `alert` or `prompt` is left |

## Map

- Leaflet 1.9.4, the one dependency added: a tested map with keyboard, touch and marker support.
  It loads only when the picker opens.
- Tiles come from `VITE_MAP_TILE_URL`. Empty means OpenStreetMap in local development and no
  tiles in a build (decision D-MAP). Their usage policy requires
  visible attribution and a referrer and forbids heavy use:
  https://operations.osmfoundation.org/policies/tiles/
- Without tiles, latitude and longitude are typed by hand.

## Text limit

Exceptions to the 200 characters: the architectural generation prompt (2,000), passwords (128),
email (254), chat messages, and the list of lot vertices, which holds numbers only (up to 50
points).

## Release order

The database migrations 016 and 017, then the backend, then this interface.

## Later requests (2026-11-22)

- R10: every delete asks in a dialog and every update happens in one (`modal/EditDialog.tsx`).
- R11: the Materials screen and tab are removed, as the owner asked again on 2026-11-22. This
  replaces decision X1 for this application. The API and the stored data stay.
- R12: the Dashboard tab shows the projects by status and creates them.
- R13: project creation accepts a document or a free-form description. PDF, PNG and JPG reading
  requires a configured reader; when none is available, descriptions use the local parametric
  layout.
- R13 builder: the backend fills missing dimensions and positions on a 15 cm grid and marks
  calculated values separately from document evidence. Users can review project, terrain and
  layout fields, preview the plan, and confirm the plans, rooms, structural elements and system
  recommendations in one transaction with undo. The architectural prompt is limited to 2,000
  characters; other short text fields remain at 200.
