# Home dashboard data

The Home dashboard only requests data for modules already visible to the signed-in
user. It reuses the existing authenticated API client and service layer.

| Dashboard information | Existing source | Display rule |
| --- | --- | --- |
| System user count | `GET /users` through `usersService.getUsers` | Shown only to users who can open the user module and only when the response includes a total-count field. A page length is not treated as the total. |
| User group count | `GET /users/groups` through `groupMaintenanceService.getGroups` | Shown only to users who can open group maintenance; count is based on the valid group records returned by the existing service. |
| Recent administrative activity | `GET /audit` through `auditService.getAuditPage` | Shown only to users who can open global audit. The Home displays at most four records, without audit detail payloads or IP addresses. |

The API does not provide a reliable user-created or user-updated timestamp in the
existing user list contract, so the Home does not claim that a recently listed
user was recently created or modified. It also does not show activity to users
without global audit permission, and does not derive totals from a paginated
page when the API omits its total.

Pull-to-refresh and the visible refresh action reload only the data sources
available to the current user.
