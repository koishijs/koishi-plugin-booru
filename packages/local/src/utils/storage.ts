import { Context } from "koishi";
import { Mapping } from "../mapping";
import { } from "@koishijs/cache"
import { LocalStorage } from "../types";

declare module '@koishijs/cache' {
    interface Tables {
        booru_local: LocalStorage.Type[]
    }
}

async function readLocalImageStorage(folders: string[], model: Mapping.Storage, ctx: Context) {
    if (model === 'file') return folders
    if (model === 'cache') {
        const cache = ctx.cache('booru_local')
        return await cache.get()
    }
    if( model === 'database') {
        
    }
}