import { PathLike, existsSync, mkdirSync } from "fs";
import { dirname } from "path";

export function mkdirs(path: PathLike) {
    if (existsSync(path)) return true
    else if (mkdirs(dirname(path.toString()))) {
        mkdirSync(path)
        return true
    }
}
