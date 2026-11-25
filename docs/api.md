# Frontend API integration

This guide describes the contracts used by the frontend. It is not an invitation to call the hosted DramaCanvas backend. Implement these contracts on a service you control, or adapt the client modules to your own API.

The public preview uses `src/demo/transport.ts`. It returns selected read-only fixtures and rejects unsupported actions. `src/services/api/request.ts` is the shared JSON client; `src/demo/install.ts` also isolates direct fetches. External connections are blocked by the Content Security Policy in `index.html`.

## Response envelope

```json
{
  "code": 0,
  "data": { "projects": [] },
  "msg": ""
}
```

`code: 0` indicates success. An HTTP 200 response with a nonzero code is a business error. The client unwraps `data`; callers do not receive a second nested envelope. Errors can include `reason` and `details`. Use non-success HTTP status codes for failed requests as well.

## Projects and short dramas

Source: [`projects.ts`](../src/services/api/projects.ts).

| Request | Input | Response data |
| --- | --- | --- |
| `GET /projects` | Optional `page`, `page_size` | Project list or paginated list |
| `POST /projects` | `name`, `type`, `aspectRatio`, `sourceType`; optional description, style and model selections | `{ project: Project }` |
| `GET /projects/:id` | Project ID | `ProjectDetail` |
| `GET /projects/:id/units` | Project ID | Units and canvas counts |
| `POST /projects/:id/units` | See the typed `createProjectUnit` input | Newly created unit |

An illustrative project input:

```json
{
  "name": "The Last Train",
  "type": "short_drama",
  "aspectRatio": "9:16",
  "sourceType": "original",
  "description": "A fictional story about a missed train and an unexpected meeting."
}
```

Values such as project type and source type must be validated against the backend you implement. This example is synthetic; it is not an exported production project.

## Skills

Source: [`skills.ts`](../src/services/api/skills.ts).

`listSkills()` accepts pagination, search, sort, tag and scope filters. The client serializes API field names and normalizes responses. A skill list contains `skills`, `categories`, `totalCount`, `hasMore`, `nextOffset`, `page` and `pageSize`.

`getSkill(id)` reads one skill. File-list and file-content contracts are distinct from the public skill descriptions stored in `src/content/skill-pages/`. Publishing a description does not publish a private skill bundle or make its download endpoint available.

## Generation tasks

Source: [`task-center.ts`](../src/services/api/task-center.ts).

`CreateTaskInput` requires `prompt`. It can also include `locale`, `sessionId`, `projectId`, `type`, `operation`, `provider`, `model`, `logicalModelId`, `input` and `priceConfirmation`.

```json
{
  "prompt": "A quiet railway platform at sunrise, slow camera push-in.",
  "type": "video",
  "model": "your-video-model",
  "input": { "aspectRatio": "16:9" }
}
```

The model name and nested options are placeholders for your implementation. Task creation can involve a price-confirmation step before submission. The server must own authorization, validation, billing decisions, provider calls and task status. The demo rejects generation requests instead of returning fake media.

## Video templates

Sources: [`ai-video-templates.ts`](../src/services/api/ai-video-templates.ts) and [`ai-video-template.ts`](../src/types/ai-video-template.ts).

List inputs include category, search query, sort, period, cursor, limit and locale. A list response has `items` and may include `total`, `nextCursor` and directory content. Template detail and generation inputs have separate types. Media slots, required fields and allowed options come from each template contract.

## Integration checklist

1. Replace local fixtures with your own authenticated transport and explicit server URL.
2. Implement authorization for every project, asset and task; never trust a browser-supplied user ID.
3. Keep provider credentials server-side and return only the fields needed by the UI.
4. Review direct fetch, upload, streaming and local-runtime paths as well as the shared JSON client.
5. Update the Content Security Policy and test success, rejection, cancellation and empty states.

The repository has no working backend hidden behind an environment flag. Setting an API URL alone does not complete this integration.
