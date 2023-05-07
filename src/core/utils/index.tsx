import { getContext } from "../../index";
import path from "path";
import fs from "fs";

export class Identifier {

    static parse (str: string): Identifier {
        return new Identifier(str.split(":")[0], str.split(":").slice(1).join(":"));
    }

    constructor (public namespace: string, public path: string) {
        if (!/^[a-z0-9_]+$/.test(namespace)) throw new Error(`Invalid identifier, namespace ${JSON.stringify(namespace)} does not match the regular expression /^[a-z1-9_]+$/`);
        if (!/^[a-z0-9_/]+$/.test(path)) throw new Error(`Invalid identifier, path ${JSON.stringify(path)} does not match the regular expression /^[a-z1-9_/]+$/`);
    }

    public toString () { return `${this.namespace}:${this.path}`; }
    public valueOf () { return this.toString(); }

}

export class Matcher <T, R = undefined> {

    public all: [T, (value: T) => any, boolean][] = [];
    public default: ((value: T) => R | unknown) = () => undefined;
    
    constructor (public value: T) {}

    set (value: T): Matcher<T, R> { this.value = value; return this; }
    clear (): Matcher <T, R> { this.all = []; return this; }

    caseGet <Z> (value: T, fullMatch: (value: T) => Z, strong = false): Matcher<T, Z | R | undefined> {
        this.all.push([value, fullMatch, strong]);
        return this;
    }

    case <Z> (value: T, fullMatch: Z, strong = false): Matcher<T, Z | R | undefined> {
        return this.caseGet(value, () => fullMatch, strong);
    }
    
    elseGet <Z> (callback: (value: T) => Z): Matcher<T, Z | R | undefined> {
        this.default = callback;
        return this;
    }
    
    else <Z> (value: Z): Matcher<T, Z | R | undefined> {
        return this.elseGet(() => value);
    }


    get (): R | undefined {
        let found = this.all.find(i => i [2] ? i[0] === this.value: i[0] == this.value);
        return (found ? found?.[1]?.(this.value) : this.default(this.value)) as R;
    }
    
}

export function useConfig (name: string) {
    let pathName = path.join(getContext().swbot.configPath, name);
    fs.mkdirSync(path.dirname(pathName));
    return pathName;
}
