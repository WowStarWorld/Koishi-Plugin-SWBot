import { Argv } from "koishi";

export class BaseEvent {}


export class CommandEvent extends BaseEvent {

    constructor (public argv: Argv) {
        super ();
    }

}
