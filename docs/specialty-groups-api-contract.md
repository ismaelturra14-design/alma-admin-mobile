# Specialty groups API contract

Base URL configured by default: `https://starfish-app-2-5jds5.ondigitalocean.app/api_nestjs`.
The service uses the existing Axios client, which continues to attach the app's
Bearer token. Swagger lists an `api_key` header parameter; when the server
provisions a value, configure `EXPO_PUBLIC_API_KEY` and this module sends it on
its requests. Do not commit a key value.

## Endpoints implemented

| Operation        | Method and path                       | Request body                                 |
| ---------------- | ------------------------------------- | -------------------------------------------- |
| List specialties | `GET /specialties`                    | —                                            |
| List groups      | `GET /specialty-groups`               | —                                            |
| Create group     | `POST /specialty-groups`              | `{ name: string }`                           |
| Update group     | `PUT /specialty-groups/{id}`          | `{ name: string }`                           |
| Delete group     | `DELETE /specialty-groups/{id}`       | —                                            |
| List links       | `GET /specialty-groups/links`         | —                                            |
| Create link      | `POST /specialty-groups/links`        | `{ specialty_id: number, group_id: number }` |
| Delete link      | `DELETE /specialty-groups/links/{id}` | —                                            |

The supplied web type definitions describe group rows as `{ id, name }`,
specialty rows as `{ option_id, title }`, and link rows as
`{ id, specialty_name, group_name }`, inside a `{ status, data }` envelope.
Link list records do not include the associated specialty/group IDs in that
contract, so the mobile screen displays the returned names and uses the link's
own `id` for unlinking. Specialty `option_id` is converted to a positive integer
before it is sent as the Swagger-required `specialty_id`; non-numeric IDs are
not offered in the link picker.

Deleting a group uses the Swagger-documented cascade behavior. The UI warns that
all links for that group are deleted as part of the same backend operation and
requires confirmation before sending the request.
