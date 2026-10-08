# User group maintenance API contract

The **Mantenedor Grupos** screen uses the existing authenticated API client.
These endpoints manage user membership only; the backend contract used by this
screen does not provide group create, edit, or delete operations.

| Operation | Method and path | Request body |
| --- | --- | --- |
| List groups | `GET /users/groups` | — |
| List users | `GET /users` | — |
| List members | `GET /users/group/{groupId}` | — |
| Assign or reassign a user | `PUT /users/{userId}` | Complete user object with `user_group: groupId` |
| Remove a user from a group | `PUT /users/{userId}` | Complete user object with `user_group: null` |

Assignment is sent as one sequential request per user. A multi-user operation
is not transactional, so the screen reports partial completion if a request
fails after earlier users were updated. Users already in the selected group
are excluded from assignment candidates; users in another group may be
reassigned.

Group descriptions fall back to `Grupo {name}` for display when the API omits
the description. If a group-member count request fails, the list calculates
that count from `GET /users` and shows a warning.
