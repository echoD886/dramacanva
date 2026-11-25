import { WESTERN_HOME_SHOWS, WITHDRAWN_WESTERN_WORK_UUIDS } from "../pages/home/western-opening-works";
import { ARCHIVED_CASE_INDEX } from "../pages/showcase/archive-loader";

export const ALL_TEMPLATE_UUIDS = Array.from(new Set([
    ...WESTERN_HOME_SHOWS.map((show) => show.templateUuid),
    ...Array.from(ARCHIVED_CASE_INDEX.keys()),
])).filter((id) => !WITHDRAWN_WESTERN_WORK_UUIDS.has(id));
