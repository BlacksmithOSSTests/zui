import Current from "src/js/state/Current"
import {BrimQuery} from "../../../../app/query-home/utils/brim-query"

const getQueryById =
  (id: string, version?: string) =>
  (_dispatch, getState): BrimQuery | null => {
    return Current.getQueryById(id, version)(getState())
  }

export default getQueryById