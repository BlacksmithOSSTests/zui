/* @flow */
import type {SpaceDetailPayload} from "../../services/zealot/types"
import Spaces from "./"
import initTestStore from "../../test/initTestStore"

let store
beforeEach(() => {
  store = initTestStore()
})

let detail: SpaceDetailPayload = {
  name: "default",
  span: {
    ts: {sec: 1425564900, ns: 0},
    dur: {sec: 3352893, ns: 750000000}
  },
  packet_support: true
}

test("setting the names", () => {
  let state = store.dispatchAll([
    Spaces.setNames("cluster1", ["default", "hq_integration"])
  ])

  expect(Spaces.names("cluster1")(state)).toEqual(["default", "hq_integration"])
})

test("space names removing", () => {
  let selector = Spaces.names("cluster1")
  let state = store.dispatchAll([
    Spaces.setNames("cluster1", ["default", "hq_integration"]),
    Spaces.setNames("cluster1", ["default"])
  ])

  expect(selector(state)).toEqual(["default"])
})

test("setting the space detail", () => {
  let state = store.dispatchAll([Spaces.setDetail("cluster1", detail)])

  expect(Spaces.get("cluster1", "default")(state)).toEqual({
    name: "default",
    max_time: {ns: 750000000, sec: 1428917793},
    min_time: {ns: 0, sec: 1425564900},
    packet_support: true
  })
})

test("setting the ingest_progress", () => {
  store.dispatchAll([
    Spaces.setIngestProgress("cluster1", detail.name, 0.5),
    Spaces.setDetail("cluster1", detail)
  ])

  let value = Spaces.getIngestProgress(
    "cluster1",
    detail.name
  )(store.getState())

  expect(value).toEqual(0.5)
})

test("getting the spaces without details", () => {
  let state = store.dispatchAll([
    Spaces.setNames("cluster1", ["space-a", "space-b"])
  ])
  let spaces = Spaces.getSpaces("cluster1")(state)

  expect(spaces).toEqual([{name: "space-a"}, {name: "space-b"}])
})

test("getting the spaces with details, others not", () => {
  let state = store.dispatchAll([
    Spaces.setNames("cluster1", ["space-a", "space-b"]),
    Spaces.setDetail("cluster1", {...detail, name: "space-a"})
  ])
  let spaces = Spaces.getSpaces("cluster1")(state)

  expect(spaces).toEqual([
    {
      name: "space-a",
      max_time: {ns: 750000000, sec: 1428917793},
      min_time: {ns: 0, sec: 1425564900},
      packet_support: true
    },
    {name: "space-b"}
  ])
})

test("only cares about spaces actions", () => {
  store.dispatch({type: "NON_SPACE"})
  expect(Spaces.raw(store.getState())).toEqual({})
})

test("ingest warnings", () => {
  let state = store.dispatchAll([
    Spaces.setDetail("cluster1", detail),
    Spaces.appendIngestWarning("cluster1", detail.name, "Problem 1"),
    Spaces.appendIngestWarning("cluster1", detail.name, "Problem 2")
  ])

  expect(Spaces.getIngestWarnings("cluster1", detail.name)(state)).toEqual([
    "Problem 1",
    "Problem 2"
  ])
})

test("clear warnings", () => {
  let state = store.dispatchAll([
    Spaces.setDetail("cluster1", detail),
    Spaces.appendIngestWarning("cluster1", detail.name, "Problem 1"),
    Spaces.appendIngestWarning("cluster1", detail.name, "Problem 2"),
    Spaces.clearIngestWarnings("cluster1", detail.name)
  ])

  expect(Spaces.getIngestWarnings("cluster1", detail.name)(state)).toEqual([])
})
