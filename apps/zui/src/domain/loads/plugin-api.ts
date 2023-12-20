import {defaultLoader} from "./default-loader"
import {LoadContext} from "./load-context"
import {Loader} from "src/core/loader/types"
import Loads from "src/js/state/Loads"
import {select} from "src/core/main/select"
import {TypedEmitter} from "src/util/typed-emitter"
import {LoadReference} from "src/js/state/Loads/types"

type Events = {
  success: (load: LoadReference) => void
  abort: (load: LoadReference) => void
  error: (load: LoadReference) => void
}

export class LoadsApi extends TypedEmitter<Events> {
  private list: LoaderApi[] = []

  // Don't use this...or rename to addLoader
  create(name: string, impl: Loader) {
    this.list.push(new LoaderApi(name, impl))
  }

  async getMatch(context: LoadContext) {
    let loader = defaultLoader
    for (const pluginLoader of this.list) {
      if (await pluginLoader.when(context)) {
        loader = pluginLoader
        break
      }
    }
    return loader
  }

  get all() {
    return select(Loads.all)
  }
}

class LoaderApi {
  when: Loader["when"]
  run: Loader["run"]
  rollback: Loader["rollback"]

  constructor(public name: string, impl: Loader) {
    this.when = impl.when
    this.run = impl.run
    this.rollback = impl.rollback
  }
}
