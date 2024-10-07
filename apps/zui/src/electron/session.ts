import log from "electron-log"
import {get} from "lodash"
import {isNumber} from "src/js/lib/is"
import {Migrations} from "./migrations"
import {SessionState} from "./session-state"
import file from "../js/lib/file"

export type Session = ReturnType<typeof session>

export default function session(path: string | null) {
  let version = 0

  return {
    path,
    getVersion() {
      return version
    },

    save(data: SessionState, p: string = path) {
      if (path === null) return
      return file(p).write(JSON.stringify({version, data}))
    },

    saveSync(data: SessionState, p: string = path) {
      if (path === null) return
      return file(p).writeSync(JSON.stringify({version, data}))
    },

    load: async function (): Promise<SessionState | null | undefined> {
      if (path === null) return null
      const migrator = await Migrations.init()
      const f = file(path)

      version = migrator.getLatestVersion()
      if (await f.exists()) {
        return await f
          .read()
          .then(JSON.parse)
          .then((state) => migrate(state, migrator))
          .then((state) => state.data)
          .catch((e) => {
            log.error("Unable to load session state")
            log.error(e)
            return undefined
          })
      } else {
        return undefined
      }
    },

    async delete() {
      if (path === null) return
      const f = file(path)
      if (await f.exists()) {
        return f.remove()
      }
    },
  }
}

type VersionedState = {version: number; data: SessionState | null | undefined}

async function migrate(appState, migrator): Promise<VersionedState> {
  const state = ensureVersioned(appState)

  if (!canMigrate(state)) {
    log.info("migrations unsupported version, using fresh state")
    return freshState(migrator.getLatestVersion())
  }

  migrator.setCurrentVersion(state.version)
  const pending = migrator.getPending().length

  log.info(`migrations pending: ${pending}`)

  if (pending) {
    try {
      log.info("migrations started")
      const nextState = migrator.runPending(state)
      log.info(`migrated to version: ${nextState.version}`)
      console.log(nextState)
      return nextState
    } catch (e) {
      console.log(e)
      log.error("unable to migrate")
      log.error(e)
      return freshState(migrator.getLatestVersion())
    }
  } else {
    return state
  }
}

function ensureVersioned(state) {
  if (isNumber(state.version)) return state
  else
    return {
      version: 0,
      data: state,
    }
}

function canMigrate(state: VersionedState) {
  const legacyVersion = get(state.data, "globalState.version")

  if (!legacyVersion) return true // Already migrated up
  if (legacyVersion === "7") return true // Release right before migration support
  return false // Anything other than above is not migratable
}

function freshState(version): VersionedState {
  return {data: undefined, version}
}
