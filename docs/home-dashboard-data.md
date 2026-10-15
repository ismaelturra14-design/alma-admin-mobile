# Home dashboard data

The Home is a personalized starting point, not a global administration report.
It uses only information already available in the authenticated session and
permission-filtered drawer menu:

| Home information | Existing source | Display rule |
| --- | --- | --- |
| Greeting | `user_fname` from the authenticated session | The name is omitted when it is empty. |
| Work profile | `user_group_name` from the authenticated session | The profile label is omitted when it is empty. |
| Quick links | `getVisibleMenuSections` and the authenticated user's permissions | Only available modules are shown; modules marked under development are excluded. |

The Home does not request global user or group totals or global audit history.
Those numbers do not describe a user's own work, and the audit endpoint exposes
administrative events rather than a general, user-focused activity feed. The
current mobile APIs do not provide a common operational summary (such as a
user's upcoming appointments or pending tasks) for every role, so the Home does
not invent one.

The drawer remains the complete permission-filtered navigation. The Home's
"Ver menú" action opens that same drawer.
