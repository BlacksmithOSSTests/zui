import Tabs from "src/js/state/Tabs"
import {Thunk} from "../../state/types"
import {getZealot} from "../getZealot"
import {handle} from "./handler"
import {SearchResponse} from "./response"
import Current from "../../state/Current"
import Tab from "../../state/Tab"
import brim, {Ts} from "src/js/brim"
import {
  ChronoField,
  DateTimeFormatterBuilder,
  LocalDateTime
} from "@js-joda/core"
import {zed} from "@brimdata/zealot"
import {isUndefined} from "lodash"

type Args = {
  query: string
  from?: Date
  to?: Date
  poolId?: string
  id?: string
  initial?: boolean
}

type annotateArgs = {
  poolId: string
  from?: Date | Ts | bigint
  to?: Date | Ts | bigint
}

export const annotateQuery = (query: string, args: annotateArgs) => {
  // if query already starts with 'from', we do not annotate it further
  if (/^from[\s(]/i.test(query)) return query
  const {
    poolId,
    from = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days
    to = new Date()
  } = args

  const annotated = [`from '${poolId}'`]
  if (!isZeroDefaultSpan(from, to)) {
    annotated.push(`ts >= ${dateToNanoTs(from)}`)
    annotated.push(`ts <= ${dateToNanoTs(to)}`)
  }
  annotated.push(query)

  return annotated.join(" | ")
}

const isZeroDefaultSpan = (
  from: Date | Ts | bigint,
  to: Date | Ts | bigint
): boolean => {
  return (
    brim.time(from).toBigInt() === 0n && brim.time(to).toBigInt() === 1000000n
  )
}

export const dateToNanoTs = (date: Date | Ts | bigint): string => {
  const NanoFormat = new DateTimeFormatterBuilder()
    .appendPattern("yyyy-MM-dd'T'HH:mm:ss")
    .appendFraction(ChronoField.NANO_OF_SECOND, 3, 9, true)
    .appendLiteral("Z")
    .toFormatter()

  return LocalDateTime.parse(brim.time(date).format()).format(NanoFormat)
}

export type BrimSearch = {
  response: SearchResponse
  promise: Promise<SearchResult>
  abort: () => void
}

export type SearchResult = {
  id: string
  tabId: string
  status: string
  initial: boolean
  shapes: zed.Schema[]
}

export function search({
  query,
  from,
  to,
  poolId,
  id,
  initial
}: Args): Thunk<BrimSearch> {
  return (dispatch, getState, {api}) => {
    const [defaultFrom, defaultTo] = Tab.getSpanAsDates(getState())
    const tab = Tabs.getActive(getState())
    const defaultPoolId = Current.getPoolId(getState())
    const zealot = dispatch(getZealot())
    const ctl = new AbortController()
    const abort = () => ctl.abort()
    const tag = id

    poolId = poolId || defaultPoolId
    to = to || defaultTo
    from = from || defaultFrom
    initial = isUndefined(initial) ? true : initial
    const req = zealot.query(annotateQuery(query, {from, to, poolId}), {
      signal: ctl.signal
    })

    api.abortables.abort({tab, tag})
    const aId = api.abortables.add({abort, tab, tag})

    const {promise, response} = handle(req)
    return {
      response,
      abort,
      promise: promise
        .then<SearchResult>(({status, shapes}) => {
          const data = {
            tabId: tab,
            id,
            shapes,
            status,
            initial
          }
          api.searches.emit("did-finish", data)
          return data
        })
        .finally(() => api.abortables.remove(aId))
    }
  }
}
